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
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-indigo-600 hover:underline">
        ← All requests
      </Link>
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-xl font-semibold break-words sm:text-2xl">{r.title}</h1>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-slate-700">{r.description}</p>
      <dl className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
            <dd className="mt-0.5 font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        {decisionOpen ? (
          <DecisionForm requestId={r.id} />
        ) : r.status === "pending" ? (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Awaiting approval. An approver will review this request.
          </div>
        ) : (
          <div
            className="rounded-lg border border-slate-200 bg-slate-100 p-4 text-sm text-slate-600"
            role="status"
          >
            <p>This request has already been {r.status}.</p>
            <div className="mt-3 flex gap-3">
              <button disabled className="min-h-11 flex-1 cursor-not-allowed rounded-md bg-emerald-600/40 px-4 py-2 font-medium text-white">
                Approve
              </button>
              <button disabled className="min-h-11 flex-1 cursor-not-allowed rounded-md bg-rose-600/40 px-4 py-2 font-medium text-white">
                Reject
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Approval history</h2>
        <ApprovalHistory approvals={approvals} audit={audit} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Activity</h2>
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
          {audit.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded border border-slate-200 bg-white px-3 py-2">
              <span className="font-medium capitalize">{l.action}</span>
              <span className="text-slate-500">{formatDate(l.created_at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
