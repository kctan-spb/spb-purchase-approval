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
    return <p className="text-sm text-slate-500">No decision yet.</p>;
  }
  return (
    <ul className="grid gap-3">
      {approvals.map((a) => {
        // The approver's name is recorded in the matching audit entry.
        const entry = audit.find(
          (l) => (l.action === "approve" || l.action === "reject") &&
            (l.details as { decision?: string } | null)?.decision === a.decision,
        );
        const approver = (entry?.details as { approver?: string } | null)?.approver;
        return (
          <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={a.decision} />
              <span className="text-xs text-slate-500">
                {approver ? `${approver} · ` : ""}
                {formatDate(a.created_at)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {a.comment ? (
                <>
                  <span className="font-medium">
                    {a.decision === "rejected" ? "Rejection reason: " : "Comment: "}
                  </span>
                  {a.comment}
                </>
              ) : (
                <span className="text-slate-400">No comment.</span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
