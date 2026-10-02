import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { resolveTimeframe } from "@/lib/timeframe";
import { writeAuditLog } from "@/features/audit/data";

export const dynamic = "force-dynamic";

const PAGE = 1000; // PostgREST returns at most 1000 rows per request

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await page(i, i + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

const myt = (iso: string | null | undefined) =>
  iso ? new Date(new Date(iso).getTime() + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ") : "";

type Details = Record<string, unknown> | null;
const str = (d: Details, k: string) => (d && typeof d[k] === "string" ? (d[k] as string) : "");

// Exports exactly what the signed-in user may see (RLS applies): requesters get their own
// requests, approvers/admins get the whole organization. Honors the status/category/time filters.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "audit" ? "audit" : "requests";
  const tf = resolveTimeframe({
    range: sp.get("range") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  const db = await getDb();

  try {
    let headers: string[];
    let rows: unknown[][];

    if (type === "audit") {
      const logs = await fetchAll<{
        created_at: string;
        action: string;
        entity_type: string;
        entity_id: string | null;
        user_id: string | null;
        details: Details;
      }>((a, b) => {
        let q = db
          .from("audit_logs")
          .select("created_at, action, entity_type, entity_id, user_id, details")
          .order("created_at", { ascending: false })
          .order("id")
          .range(a, b);
        if (tf.from) q = q.gte("created_at", tf.from);
        if (tf.to) q = q.lt("created_at", tf.to);
        return q;
      });
      headers = ["Time (MYT)", "Action", "Entity type", "Entity ID", "By", "Details (JSON)", "User ID"];
      rows = logs.map((l) => [
        myt(l.created_at),
        l.action,
        l.entity_type,
        l.entity_id,
        str(l.details, "approver") || str(l.details, "requested_by"),
        l.details,
        l.user_id,
      ]);
    } else {
      const status = sp.get("status");
      const category = sp.get("category");
      const reqs = await fetchAll<{
        id: string;
        created_at: string;
        title: string;
        description: string;
        amount: number | string;
        currency: string;
        category: string | null;
        vendor: string | null;
        routine: boolean;
        status: string;
      }>((a, b) => {
        let q = db
          .from("purchase_requests")
          .select("id, created_at, title, description, amount, currency, category, vendor, routine, status")
          .order("created_at", { ascending: false })
          .order("id")
          .range(a, b);
        if (status) q = q.eq("status", status);
        if (category) q = q.eq("category", category);
        if (tf.from) q = q.gte("created_at", tf.from);
        if (tf.to) q = q.lt("created_at", tf.to);
        return q;
      });

      const approvals = await fetchAll<{
        request_id: string;
        decision: string;
        comment: string | null;
        created_at: string;
      }>((a, b) =>
        db
          .from("approvals")
          .select("request_id, decision, comment, created_at")
          .order("id")
          .range(a, b),
      );
      const logs = await fetchAll<{ entity_id: string | null; action: string; details: Details }>((a, b) =>
        db
          .from("audit_logs")
          .select("entity_id, action, details")
          .eq("entity_type", "purchase_request")
          .in("action", ["create", "approve", "reject"])
          .order("id")
          .range(a, b),
      );

      const decision = new Map(approvals.map((x) => [x.request_id, x]));
      const requestedBy = new Map<string, string>();
      const decidedBy = new Map<string, string>();
      for (const l of logs) {
        if (!l.entity_id) continue;
        if (l.action === "create") requestedBy.set(l.entity_id, str(l.details, "requested_by"));
        else decidedBy.set(l.entity_id, str(l.details, "approver"));
      }

      headers = [
        "Request ID", "Submitted (MYT)", "Title", "Description", "Amount", "Currency", "Category", "Vendor",
        "Routine", "Status", "Requested by", "Decision", "Decision comment", "Decided by", "Decided (MYT)",
      ];
      rows = reqs.map((r) => {
        const d = decision.get(r.id);
        return [
          r.id,
          myt(r.created_at),
          r.title,
          r.description,
          Number(r.amount),
          r.currency,
          r.category,
          r.vendor,
          r.routine ? "Yes" : "No",
          r.status,
          requestedBy.get(r.id) ?? "",
          d?.decision ?? "",
          d?.comment ?? "",
          decidedBy.get(r.id) ?? "",
          myt(d?.created_at),
        ];
      });
    }

    // Data leaving the system is itself audited. A failure here must not block the download.
    try {
      await writeAuditLog({
        action: "export",
        entity_type: "export",
        entity_id: null,
        details: { export: type, rows: rows.length, timeframe: tf.label, status: sp.get("status"), category: sp.get("category") },
      });
    } catch {}

    const day = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    const slug = tf.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const name = `${type === "audit" ? "audit-trail" : "purchase-requests"}_${day}_${slug}.csv`;
    return new NextResponse(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Export failed. Please try again.", { status: 500 });
  }
}
