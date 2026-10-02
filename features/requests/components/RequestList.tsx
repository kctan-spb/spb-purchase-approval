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
      <div className="rounded-2xl border border-dashed border-line bg-panel p-8 text-center shadow-sm">
        <p className="text-muted">{emptyMessage}</p>
        {showNewButton && (
          <Link
            href="/requests/new"
            className="btn-primary mt-4"
          >
            New request
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
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 min-w-0 flex-1 text-lg leading-snug font-semibold break-words text-ink">{r.title}</h3>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
              <span className="min-w-0 truncate">
                {[r.vendor, r.category].filter(Boolean).join(" · ") || "—"}
              </span>
              {r.routine && (
                <span className="shrink-0 rounded-full border border-line bg-sunken px-2 py-0.5 text-xs text-muted">routine</span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-lg font-semibold whitespace-nowrap tabular-nums text-ink">
                {formatMoney(r.amount, r.currency)}
                {r.currency !== "MYR" && r.amount_myr !== null && (
                  <span className="ml-2 text-sm font-normal text-muted">≈ {formatMoney(r.amount_myr, "MYR")}</span>
                )}
              </span>
              <span className="min-w-0 truncate text-xs text-muted">Submitted {formatDate(r.created_at)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
