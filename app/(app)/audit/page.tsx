import Link from "next/link";
import { listAuditLogs } from "@/features/audit/data";
import { formatDate } from "@/lib/format";
import { filterQuery, resolveTimeframe } from "@/lib/timeframe";
import { TimeFrameFields } from "@/components/TimeFrameFields";
import { ExportButton } from "@/components/ExportButton";

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  create: "bg-sky-50 text-sky-900 ring-sky-300",
  approve: "bg-emerald-50 text-emerald-900 ring-emerald-300",
  reject: "bg-brand-50 text-brand-800 ring-brand-300",
  update: "bg-amber-50 text-amber-900 ring-amber-300",
  delete: "bg-sunken text-ink ring-line",
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
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Governance</p>
          <h1 className="page-title">Audit trail</h1>
        </div>
        <ExportButton href={exportHref} label="Export CSV" />
      </div>
      <form method="get" className="mb-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <TimeFrameFields range={tf.range} from={tf.fromInput} to={tf.toInput} />
        <button className="btn-secondary px-4">
          Apply
        </button>
      </form>
      <p className="mb-4 text-xs text-muted">
        Showing: {tf.label}. The latest 200 entries are listed here; the CSV contains all of them.
      </p>
      {logs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-panel p-8 text-center text-muted shadow-sm shadow-sm">
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
              <li key={l.id} className="card p-3 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${ACTION_STYLE[l.action] ?? "bg-sunken text-ink ring-line"}`}>
                      {l.action}
                    </span>
                    <span className="text-sm text-muted">{l.entity_type.replace("_", " ")}</span>
                    {l.entity_type === "purchase_request" && l.entity_id && (
                      <Link
                        href={`/requests/${l.entity_id}`}
                        className="-my-2 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        View request
                      </Link>
                    )}
                  </div>
                  <time className="text-xs text-muted">{formatDate(l.created_at)}</time>
                </div>
                {(who || note) && (
                  <p className="mt-1 text-sm break-words text-muted">
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
