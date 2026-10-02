import Link from "next/link";
import { listAuditLogs } from "@/features/audit/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  create: "bg-sky-100 text-sky-800",
  approve: "bg-emerald-100 text-emerald-800",
  reject: "bg-rose-100 text-rose-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-slate-200 text-slate-700",
};

export default async function AuditPage() {
  const logs = await listAuditLogs();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">Audit Trail</h1>
      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No activity recorded yet.
        </p>
      ) : (
        <ol className="grid gap-2">
          {logs.map((l) => {
            const d = (l.details ?? {}) as Record<string, unknown>;
            const who = (d.approver ?? d.requested_by) as string | undefined;
            const note = (d.comment ?? d.name ?? (d.from ? `${d.from} → ${d.to}` : undefined)) as string | undefined;
            return (
              <li key={l.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${ACTION_STYLE[l.action] ?? "bg-slate-100"}`}>
                      {l.action}
                    </span>
                    <span className="text-sm text-slate-600">{l.entity_type.replace("_", " ")}</span>
                    {l.entity_type === "purchase_request" && l.entity_id && (
                      <Link href={`/requests/${l.entity_id}`} className="text-sm text-indigo-600 hover:underline">
                        View request
                      </Link>
                    )}
                  </div>
                  <time className="text-xs text-slate-500">{formatDate(l.created_at)}</time>
                </div>
                {(who || note) && (
                  <p className="mt-1 text-sm text-slate-600">
                    {who && <span className="font-medium">{who}</span>}
                    {who && note && " — "}
                    {note}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
