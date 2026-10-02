import Link from "next/link";
import { listRequests, spendingSummary } from "@/features/requests/data";
import { listCategories } from "@/features/categories/data";
import { RequestList } from "@/features/requests/components/RequestList";
import { formatMoney, formatTotals } from "@/lib/format";
import { filterQuery, resolveTimeframe } from "@/lib/timeframe";
import { TimeFrameFields } from "@/components/TimeFrameFields";
import { ExportButton } from "@/components/ExportButton";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "rejected"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const category = sp.category || undefined;
  const tf = resolveTimeframe(sp);
  const filtered = !!(status || category || tf.range !== "all");

  const [requests, categories, summary] = await Promise.all([
    listRequests({ status, category, from: tf.from, to: tf.to }),
    listCategories(),
    spendingSummary({ from: tf.from, to: tf.to }),
  ]);
  const exportHref = `/api/export?${filterQuery({
    status,
    category,
    range: tf.range === "all" ? undefined : tf.range,
    from: tf.range === "custom" ? tf.fromInput : undefined,
    to: tf.range === "custom" ? tf.toInput : undefined,
  })}`;

  const select = "field min-w-0 sm:w-auto sm:max-w-56";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Purchase requests</h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <ExportButton href={exportHref} />
          <Link
            href="/requests/new"
            className="btn-primary shrink-0 px-4"
          >
            New request
          </Link>
        </div>
      </div>
      <p className="-mt-3 mb-4 text-xs text-muted sm:-mt-4">
        Showing: {tf.label}. Totals and the CSV export follow the filters below.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:mb-6">
        {(
          [
            ["Pending", summary.pending, "border-t-amber-500", "text-amber-900"],
            ["Approved", summary.approved, "border-t-emerald-600", "text-emerald-900"],
          ] as const
        ).map(([label, s, border, text]) => (
          <div key={label} className={`card min-w-0 border-t-4 ${border} p-3 sm:p-4`}>
            <p className={`text-xs font-semibold tracking-[0.16em] ${text} uppercase`}>{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums break-words text-ink sm:text-2xl">
              {formatTotals(s.byCurrency)}
            </p>
            {s.byCurrency.some((c) => c.currency !== "MYR") && s.totalMyr !== null && (
              <p className="text-sm text-ink">About {formatMoney(s.totalMyr, "MYR")} in total</p>
            )}
            <p className="text-xs text-muted">
              {s.count} {s.count === 1 ? "request" : "requests"}
            </p>
          </div>
        ))}
      </div>

      <form method="get" className="mb-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select name="status" defaultValue={status ?? ""} className={select} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className={select} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <TimeFrameFields range={tf.range} from={tf.fromInput} to={tf.toInput} />
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex-1 px-4 sm:flex-none">
            Filter
          </button>
          {filtered && (
            <Link href="/" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-700 hover:underline">
              Clear
            </Link>
          )}
        </div>
      </form>

      <RequestList
        requests={requests}
        emptyMessage={
          filtered ? "No requests match these filters." : "No purchase requests yet. Create one to get started."
        }
        showNewButton={!filtered}
      />
    </div>
  );
}
