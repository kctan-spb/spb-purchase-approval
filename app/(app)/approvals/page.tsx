import { redirect } from "next/navigation";
import { listPendingRequests } from "@/features/requests/data";
import { RequestList } from "@/features/requests/components/RequestList";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user?.canApprove) redirect("/");

  const pending = await listPendingRequests();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title mb-1">Pending approvals</h1>
      <p className="mb-6 text-sm text-muted">
        Pending requests, highest priority first (amount, age, non-routine). Open one to approve or reject. You can
        only decide requests you did not raise and that are within your approval limit; the number next to
        Approvals in the menu counts those.
      </p>
      <RequestList
        requests={pending}
        emptyMessage="No pending approvals. All caught up!"
        showNewButton={false}
      />
    </div>
  );
}
