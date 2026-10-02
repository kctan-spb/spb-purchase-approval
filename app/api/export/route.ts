import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { resolveTimeframe } from "@/lib/timeframe";

export const dynamic = "force-dynamic";

const PAGE = 1000; // PostgREST returns at most 1000 rows per request
const MAX_ROWS = 20_000;
const CHUNK = 150; // request ids per "in" filter (keeps the URL short)

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

const text = (body: string, status: number) =>
  new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

// Exports exactly what the signed-in user may see (RLS applies): requesters get their own
// requests, approvers/admins get the whole organization. Honors the status/category/time filters.
// The export itself is recorded by the database function log_export BEFORE any data is returned;
// if that fails the export fails.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return text("Unauthorized", 401);

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "audit" ? "audit" : "requests";
  if (type === "audit" && !user.canApprove) return text("Only approvers and admins can export the audit trail.", 403);

  const tf = resolveTimeframe({
    range: sp.get("range") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  const status = sp.get("status");
  const category = sp.get("category");
  const db = await getDb();

  try {
    // 1. Size check, so a huge export is refused instead of timing out.
    let countQ =
      type === "audit"
        ? db.from("audit_logs").select("id", { count: "exact", head: true })
        : db.from("purchase_requests").select("id", { count: "exact", head: true });
    if (type === "requests") {
      if (status) countQ = countQ.eq("status", status);
      if (category) countQ = countQ.eq("category", category);
    }
    if (tf.from) countQ = countQ.gte("created_at", tf.from);
    if (tf.to) countQ = countQ.lt("created_at", tf.to);
    const { count, error: countErr } = await countQ;
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > MAX_ROWS)
      return text(
        `This export would contain ${(count ?? 0).toLocaleString("en-MY")} rows. The limit is ${MAX_ROWS.toLocaleString("en-MY")}. Choose a shorter time frame and try again.`,
        413,
      );

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
      const reqs = await fetchAll<{
        id: string;
        created_at: string;
        title: string;
        description: string;
        amount: number | string;
        currency: string;
        amount_myr: number | string | null;
        category: string | null;
        vendor: string | null;
        routine: boolean;
        status: string;
        requester_name: string | null;
        requester_email: string | null;
      }>((a, b) => {
        let q = db
          .from("purchase_requests")
          .select(
            "id, created_at, title, description, amount, currency, amount_myr, category, vendor, routine, status, requester_name, requester_email",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(a, b);
        if (status) q = q.eq("status", status);
        if (category) q = q.eq("category", category);
        if (tf.from) q = q.gte("created_at", tf.from);
        if (tf.to) q = q.lt("created_at", tf.to);
        return q;
      });

      // Decisions and attachment counts for exactly these requests (read from approvals / request
      // columns, not from audit details).
      type Decision = {
        request_id: string;
        decision: string;
        comment: string | null;
        created_at: string;
        approver_name: string | null;
        approver_email: string | null;
      };
      const decisions = new Map<string, Decision>();
      const attachmentCount = new Map<string, number>();
      const ids = reqs.map((r) => r.id);
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
      for (let i = 0; i < chunks.length; i += 5) {
        await Promise.all(
          chunks.slice(i, i + 5).map(async (chunk) => {
            const [ap, at] = await Promise.all([
              db
                .from("approvals")
                .select("request_id, decision, comment, created_at, approver_name, approver_email")
                .in("request_id", chunk),
              db.from("request_attachments").select("request_id").in("request_id", chunk),
            ]);
            if (ap.error) throw new Error(ap.error.message);
            if (at.error) throw new Error(at.error.message);
            for (const d of (ap.data ?? []) as Decision[]) decisions.set(d.request_id, d);
            for (const a of (at.data ?? []) as { request_id: string }[])
              attachmentCount.set(a.request_id, (attachmentCount.get(a.request_id) ?? 0) + 1);
          }),
        );
      }

      headers = [
        "Request ID", "Submitted (MYT)", "Title", "Description", "Amount", "Currency", "Amount (MYR)", "Category",
        "Vendor", "Routine", "Status", "Requested by", "Requester email", "Decision", "Decision comment",
        "Decided by", "Decider email", "Decided (MYT)", "Attachments",
      ];
      rows = reqs.map((r) => {
        const d = decisions.get(r.id);
        return [
          r.id,
          myt(r.created_at),
          r.title,
          r.description,
          Number(r.amount),
          r.currency,
          r.amount_myr === null || r.amount_myr === undefined ? "" : Number(r.amount_myr),
          r.category,
          r.vendor,
          r.routine ? "Yes" : "No",
          r.status,
          r.requester_name ?? "",
          r.requester_email ?? "",
          d?.decision ?? "",
          d?.comment ?? "",
          d?.approver_name ?? "",
          d?.approver_email ?? "",
          myt(d?.created_at),
          attachmentCount.get(r.id) ?? 0,
        ];
      });
    }

    // 2. Data leaving the system is audited FIRST. If that cannot be recorded, nothing is handed over.
    const { error: logErr } = await db.rpc("log_export", {
      p_type: type,
      p_rows: rows.length,
      p_timeframe: tf.label,
      p_status: type === "requests" ? status : null,
      p_category: type === "requests" ? category : null,
    });
    if (logErr) {
      if (logErr.message.includes("forbidden")) return text("Only approvers and admins can export the audit trail.", 403);
      return text("The export could not be recorded, so it was not produced. Please try again.", 500);
    }

    const day = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    const slug = tf.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const name = `${type === "audit" ? "audit-trail" : "purchase-requests"}_${day}_${slug}_${rows.length}-rows.csv`;
    return new NextResponse(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return text("Export failed. Please try again.", 500);
  }
}
