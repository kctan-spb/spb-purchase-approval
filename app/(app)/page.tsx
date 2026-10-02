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
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Purchase Requests</h1>
        <Link
          href="/requests/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Request
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Pending</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(summary.pendingTotal)}</p>
          <p className="text-xs text-amber-700">{summary.pendingCount} requests</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Approved</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(summary.approvedTotal)}</p>
          <p className="text-xs text-emerald-700">{summary.approvedCount} requests</p>
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
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
        <button className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Filter
        </button>
        {filtered && (
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            Clear
          </Link>
        )}
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
