import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Approval } from "@/lib/db/types";

/** The outcome of a decided request, shown at the top of the detail page. */
export function DecisionSummary({ approval, status }: { approval?: Approval; status: string }) {
  const approved = status === "approved";
  return (
    <section
      aria-label="Decision"
      className={`card mt-4 p-4 sm:p-5 ${approved ? "border-emerald-300 bg-emerald-50" : "border-brand-300 bg-brand-50"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge status={status} />
        <p className="text-sm font-semibold text-ink">
          {approved ? "Approved" : "Rejected"}
          {approval?.approver_name ? ` by ${approval.approver_name}` : ""}
        </p>
        {approval && <p className="text-xs text-muted">{formatDate(approval.created_at)}</p>}
      </div>
      {approval ? (
        <p className="mt-2 text-sm break-words text-ink">
          {approval.comment ? (
            <>
              <span className="font-semibold">{approved ? "Comment: " : "Reason: "}</span>
              {approval.comment}
            </>
          ) : (
            <span className="text-muted italic">No comment was added.</span>
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted italic">Decision details are not available.</p>
      )}
    </section>
  );
}
