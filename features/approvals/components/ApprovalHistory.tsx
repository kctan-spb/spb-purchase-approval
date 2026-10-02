import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Approval, AuditLog } from "@/lib/db/types";

export function ApprovalHistory({
  approvals,
  audit,
}: {
  approvals: Approval[];
  audit: AuditLog[];
}) {
  if (approvals.length === 0) {
    return <p className="text-sm text-muted">No decision yet.</p>;
  }
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {approvals.map((a) => {
        // The approver's name is recorded in the matching audit entry.
        const entry = audit.find(
          (l) => (l.action === "approve" || l.action === "reject") &&
            (l.details as { decision?: string } | null)?.decision === a.decision,
        );
        const approver = (entry?.details as { approver?: string } | null)?.approver;
        return (
          <li key={a.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <StatusBadge status={a.decision} />
              <span className="text-xs text-muted">
                {approver ? `${approver} · ` : ""}
                {formatDate(a.created_at)}
              </span>
            </div>
            <p className="mt-2 text-sm break-words text-ink">
              {a.comment ? (
                <>
                  <span className="font-medium">
                    {a.decision === "rejected" ? "Rejection reason: " : "Comment: "}
                  </span>
                  {a.comment}
                </>
              ) : (
                <span className="text-muted italic">No comment.</span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
