import Link from "next/link";
import { listRequests, spendingSummary } from "@/features/requests/data";
import { listCategories } from "@/features/categories/data";
import { RequestList } from "@/features/requests/components/RequestList";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "rejected"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const category = sp.category || undefined;
  const filtered = !!(status || category);

  const [requests, categories, summary] = await Promise.all([
    listRequests({ status, category }),
    listCategories(),
    spendingSummary(),
  ]);

  const select =
    "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto sm:max-w-56";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="min-w-0 text-xl font-semibold sm:text-2xl">Purchase Requests</h1>
        <Link
          href="/requests/new"
          className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-indigo-700"
        >
          New Request
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6">
        <div className="min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Pending</p>
          <p className="text-lg font-semibold tabular-nums break-words sm:text-xl">{formatMoney(summary.pendingTotal)}</p>
          <p className="text-xs text-amber-700">{summary.pendingCount} requests</p>
        </div>
        <div className="min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Approved</p>
          <p className="text-lg font-semibold tabular-nums break-words sm:text-xl">{formatMoney(summary.approvedTotal)}</p>
          <p className="text-xs text-emerald-700">{summary.approvedCount} requests</p>
        </div>
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
        <div className="flex items-center gap-2">
          <button className="min-h-11 flex-1 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 sm:flex-none">
            Filter
          </button>
          {filtered && (
            <Link href="/" className="inline-flex min-h-11 items-center px-3 text-sm text-indigo-600 hover:underline">
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
