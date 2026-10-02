import Link from "next/link";
import { listAuditLogs } from "@/features/audit/data";
import { formatDate } from "@/lib/format";
import { filterQuery, resolveTimeframe } from "@/lib/timeframe";
import { TimeFrameFields } from "@/components/TimeFrameFields";
import { ExportButton } from "@/components/ExportButton";

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  create: "bg-sky-100 text-sky-800",
  approve: "bg-emerald-100 text-emerald-800",
  reject: "bg-rose-100 text-rose-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-slate-200 text-slate-700",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const tf = resolveTimeframe(await searchParams);
  const logs = await listAuditLogs(200, { from: tf.from, to: tf.to });
  const exportHref = `/api/export?${filterQuery({
    type: "audit",
    range: tf.range === "all" ? undefined : tf.range,
    from: tf.range === "custom" ? tf.fromInput : undefined,
    to: tf.range === "custom" ? tf.toInput : undefined,
  })}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl font-semibold sm:text-2xl">Audit Trail</h1>
        <ExportButton href={exportHref} label="Export CSV" />
      </div>
      <form method="get" className="mb-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <TimeFrameFields range={tf.range} from={tf.fromInput} to={tf.toInput} />
        <button className="min-h-11 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Apply
        </button>
      </form>
      <p className="mb-4 text-xs text-slate-500">
        Showing: {tf.label}. The latest 200 entries are listed here; the CSV contains all of them.
      </p>
      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No activity recorded yet.
        </p>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {logs.map((l) => {
            const d = (l.details ?? {}) as Record<string, unknown>;
            const who = (d.approver ?? d.requested_by) as string | undefined;
            const note = (d.comment ??
              d.name ??
              (d.from ? `${d.from} → ${d.to}` : undefined) ??
              (d.export ? `${d.export} export · ${d.rows} rows · ${d.timeframe}` : undefined) ??
              (d.role_to ? `role: ${d.role_from} → ${d.role_to}` : undefined)) as string | undefined;
            return (
              <li key={l.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${ACTION_STYLE[l.action] ?? "bg-slate-100"}`}>
                      {l.action}
                    </span>
                    <span className="text-sm text-slate-600">{l.entity_type.replace("_", " ")}</span>
                    {l.entity_type === "purchase_request" && l.entity_id && (
                      <Link
                        href={`/requests/${l.entity_id}`}
                        className="-my-2 inline-flex min-h-11 items-center px-1 text-sm text-indigo-600 hover:underline"
                      >
                        View request
                      </Link>
                    )}
                  </div>
                  <time className="text-xs text-slate-500">{formatDate(l.created_at)}</time>
                </div>
                {(who || note) && (
                  <p className="mt-1 text-sm break-words text-slate-600">
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
