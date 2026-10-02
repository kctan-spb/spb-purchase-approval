import Link from "next/link";
import { listRequests } from "@/features/requests/data";
import { RequestList } from "@/features/requests/components/RequestList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requests = await listRequests();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Purchase Requests</h1>
        <Link
          href="/requests/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Request
        </Link>
      </div>
      <RequestList requests={requests} />
    </div>
  );
}
