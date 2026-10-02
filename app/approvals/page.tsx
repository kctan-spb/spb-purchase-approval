import { listPendingRequests } from "@/features/requests/data";
import { RequestList } from "@/features/requests/components/RequestList";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const pending = await listPendingRequests();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold">Approvals</h1>
      <p className="mb-6 text-sm text-slate-500">
        Pending requests, highest priority first (amount, age, non-routine). Open one to approve or reject.
      </p>
      <RequestList
        requests={pending}
        emptyMessage="No pending approvals. All caught up!"
        showNewButton={false}
      />
    </div>
  );
}
