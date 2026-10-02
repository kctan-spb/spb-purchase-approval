import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequest } from "@/features/requests/data";
import { listAttachments } from "@/features/requests/attachments";
import { listApprovalsByRequest } from "@/features/approvals/data";
import { listAuditLogsForEntity } from "@/features/audit/data";
import { DecisionForm } from "@/features/approvals/components/DecisionForm";
import { DecisionSummary } from "@/features/approvals/components/DecisionSummary";
import { RequestTimeline } from "@/features/approvals/components/RequestTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBytes, formatDate, formatMoney } from "@/lib/format";
import { getApprovalLimit, getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { whyCannotDecide } from "@/lib/decision";

export const dynamic = "force-dynamic";

export default async function RequestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; attachments?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const r = await getRequest(id);
  if (!r) notFound();

  const [approvals, audit, attachments, user, settings] = await Promise.all([
    listApprovalsByRequest(id),
    listAuditLogsForEntity(id),
    listAttachments(id).catch(() => null),
    getCurrentUser(),
    getSettings(),
  ]);

  const pending = r.status === "pending";
  // Why this person cannot decide (if they cannot). The database enforces the same rules.
  let blocked: string | null = null;
  if (pending) {
    const limit = user?.canApprove ? await getApprovalLimit().catch(() => 0) : 0;
    blocked = whyCannotDecide({
      canApprove: !!user?.canApprove,
      isOwn: r.user_id === user?.id,
      allowSelfApproval: settings.allowSelfApproval,
      amountMyr: r.amount_myr,
      limitMyr: limit,
    });
  }
  const decisionOpen = pending && !!user && blocked === null;
  const largeAmount = r.amount_myr === null || r.amount_myr >= settings.commentRequiredOverMyr;
  const requester = r.requester_name || r.requester_email || "the requester";
  const decision = approvals[0];
  const foreign = r.currency !== "MYR";

  const rows: [string, React.ReactNode][] = [
    [
      "Requested by",
      r.requester_name || r.requester_email ? (
        <>
          {r.requester_name || r.requester_email}
          {r.requester_name && r.requester_email && (
            <span className="block text-sm font-normal break-all text-muted">{r.requester_email}</span>
          )}
        </>
      ) : (
        "—"
      ),
    ],
    ["Submitted", formatDate(r.created_at)],
    ["Category", r.category ?? "—"],
    ["Vendor", r.vendor ?? "—"],
    ["Routine", r.routine ? "Yes" : "No"],
  ];

  return (
    <div className={`mx-auto max-w-3xl ${decisionOpen ? "pb-44 md:pb-0" : ""}`}>
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-brand-700 hover:underline">
        ← All requests
      </Link>

      {sp.submitted === "1" && (
        <div role="status" className="card mt-2 border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Request submitted</p>
          <p className="mt-1">
            {sp.attachments === "failed"
              ? "Your request was saved, but the attachments could not be saved. Contact an approver or the administrator to send them."
              : "An approver will review it. You can follow its status on this page."}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="page-title min-w-0 flex-1 break-words">{r.title}</h1>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
        {formatMoney(r.amount, r.currency)}
        {foreign && (
          <span className="ml-2 text-base font-normal text-muted">
            {r.amount_myr !== null ? `≈ ${formatMoney(r.amount_myr, "MYR")}` : "MYR value not recorded"}
          </span>
        )}
      </p>

      {!pending && <DecisionSummary approval={decision} status={r.status} />}

      <p className="mt-4 text-lg leading-relaxed whitespace-pre-wrap break-words text-ink">{r.description}</p>
      <dl className="card mt-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-0.5 text-lg font-semibold break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="attachments-h">
        <h2 id="attachments-h" className="mb-3 text-xl font-semibold text-ink">
          Attachments
        </h2>
        {attachments === null ? (
          <p className="text-sm text-muted">Attachments could not be loaded. Reload the page to try again.</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted">No attachments.</p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {attachments.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 min-w-0 items-center font-semibold break-all text-brand-700 hover:underline"
                  >
                    {a.filename}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="min-w-0 break-all text-ink">{a.filename} (link unavailable)</span>
                )}
                <span className="text-sm text-muted">{formatBytes(a.size_bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending && (
        <section className="mt-8">
          {decisionOpen ? (
            <DecisionForm
              requestId={r.id}
              amountLabel={formatMoney(r.amount, r.currency)}
              vendor={r.vendor}
              requester={requester}
              largeAmount={largeAmount}
            />
          ) : (
            <div role="status" className="card border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Awaiting approval</p>
              <p className="mt-1">{blocked}</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold text-ink">History</h2>
        <RequestTimeline approvals={approvals} audit={audit} />
      </section>
    </div>
  );
}
