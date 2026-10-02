import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import type { PurchaseRequest } from "@/lib/db/types";

export function RequestList({
  requests,
  emptyMessage = "No purchase requests yet. Create one to get started.",
  showNewButton = true,
}: {
  requests: PurchaseRequest[];
  emptyMessage?: string;
  showNewButton?: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-600">{emptyMessage}</p>
        {showNewButton && (
          <Link
            href="/requests/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New Request
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {requests.map((r) => (
        <li key={r.id}>
          <Link
            href={`/requests/${r.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 min-w-0 flex-1 break-words font-medium text-slate-900">{r.title}</h3>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-slate-500">
              <span className="min-w-0 truncate">
                {[r.vendor, r.category].filter(Boolean).join(" · ") || "—"}
              </span>
              {r.routine && (
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">routine</span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">
                {formatMoney(r.amount, r.currency)}
              </span>
              <span className="min-w-0 truncate text-xs text-slate-500">Submitted {formatDate(r.created_at)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
