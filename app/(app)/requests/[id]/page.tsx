import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequest } from "@/features/requests/data";
import { listApprovalsByRequest } from "@/features/approvals/data";
import { listAuditLogsForEntity } from "@/features/audit/data";
import { DecisionForm } from "@/features/approvals/components/DecisionForm";
import { ApprovalHistory } from "@/features/approvals/components/ApprovalHistory";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRequest(id);
  if (!r) notFound();

  const [approvals, audit, user] = await Promise.all([
    listApprovalsByRequest(id),
    listAuditLogsForEntity(id),
    getCurrentUser(),
  ]);

  // The decision form pins Approve/Reject to the bottom on phones; reserve room so nothing hides behind it.
  const decisionOpen = r.status === "pending" && !!user?.canApprove;

  const rows: [string, React.ReactNode][] = [
    ["Amount", formatMoney(r.amount, r.currency)],
    ["Category", r.category ?? "—"],
    ["Vendor", r.vendor ?? "—"],
    ["Routine", r.routine ? "Yes" : "No"],
    ["Submitted", formatDate(r.created_at)],
  ];

  return (
    <div className={`mx-auto max-w-3xl ${decisionOpen ? "pb-32 md:pb-0" : ""}`}>
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-brand-700 hover:underline">
        ← All requests
      </Link>
      <p className="eyebrow mt-2">Request</p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="page-title min-w-0 flex-1 break-words">{r.title}</h1>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-3 text-lg leading-relaxed whitespace-pre-wrap break-words text-ink">{r.description}</p>
      <dl className="card mt-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-0.5 text-lg font-semibold break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        {decisionOpen ? (
          <DecisionForm requestId={r.id} />
        ) : r.status === "pending" ? (
          <div role="status" className="card border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Awaiting approval. An approver will review this request.
          </div>
        ) : (
          <div
            className="card bg-sunken p-4 text-sm text-ink"
            role="status"
          >
            <p>This request has already been {r.status}.</p>
            <div className="mt-3 flex gap-3">
              <button disabled className="min-h-11 flex-1 cursor-not-allowed rounded-xl bg-emerald-700/50 px-4 py-2 font-semibold text-white">
                Approve
              </button>
              <button disabled className="min-h-11 flex-1 cursor-not-allowed rounded-xl bg-brand-600/50 px-4 py-2 font-semibold text-white">
                Reject
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <p className="eyebrow">Record</p>
        <h2 className="mb-3 text-xl font-semibold text-ink">Approval history</h2>
        <ApprovalHistory approvals={approvals} audit={audit} />
      </section>

      <section className="mt-8">
        <p className="eyebrow">Audit</p>
        <h2 className="mb-3 text-xl font-semibold text-ink">Activity</h2>
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
          {audit.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded-xl border border-line bg-panel px-3 py-2 shadow-sm">
              <span className="font-semibold text-ink capitalize">{l.action}</span>
              <span className="text-muted">{formatDate(l.created_at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
