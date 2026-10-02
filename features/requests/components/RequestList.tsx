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
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New Request
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {requests.map((r) => (
        <li key={r.id}>
          <Link
            href={`/requests/${r.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-slate-900">{r.title}</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {[r.vendor, r.category].filter(Boolean).join(" · ") || "—"}
                  {r.routine && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      routine
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">
                  {formatMoney(r.amount, r.currency)}
                </span>
                <StatusBadge status={r.status} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Submitted {formatDate(r.created_at)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
