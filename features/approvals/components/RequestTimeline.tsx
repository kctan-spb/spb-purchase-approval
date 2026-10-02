import { formatDate } from "@/lib/format";
import type { Approval, AuditLog } from "@/lib/db/types";

type Details = Record<string, unknown>;
const s = (d: Details, k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : undefined);

/** One chronological history of the request: submission and decision, built from the audit trail. */
export function RequestTimeline({ approvals, audit }: { approvals: Approval[]; audit: AuditLog[] }) {
  const events = audit
    .filter((l) => l.entity_type === "purchase_request")
    .map((l) => {
      const d = (l.details ?? {}) as Details;
      let title: string;
      let note: string | undefined;
      if (l.action === "create") {
        title = `Submitted${s(d, "requested_by") ? ` by ${s(d, "requested_by")}` : ""}`;
      } else if (l.action === "approve" || l.action === "reject") {
        const approval = approvals.find((a) => a.decision === (l.action === "approve" ? "approved" : "rejected"));
        const who = s(d, "approver") ?? approval?.approver_name ?? undefined;
        title = `${l.action === "approve" ? "Approved" : "Rejected"}${who ? ` by ${who}` : ""}`;
        const comment = s(d, "comment") ?? approval?.comment ?? undefined;
        note = comment ? `${l.action === "reject" ? "Reason" : "Comment"}: ${comment}` : undefined;
      } else {
        title = l.action.charAt(0).toUpperCase() + l.action.slice(1);
      }
      return { id: l.id, title, note, at: l.created_at, kind: l.action };
    });

  if (events.length === 0) return <p className="text-sm text-muted">No history recorded yet.</p>;

  const dot: Record<string, string> = {
    create: "bg-sky-600",
    approve: "bg-emerald-700",
    reject: "bg-brand-600",
  };

  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span aria-hidden="true" className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${dot[e.kind] ?? "bg-muted"}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold break-words text-ink">{e.title}</p>
            <p className="text-xs text-muted">{formatDate(e.at)}</p>
            {e.note && <p className="mt-1 text-sm break-words text-ink">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
