import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Request not found</h1>
      <p className="mt-2 text-slate-600">It may have been removed or the link is wrong.</p>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-indigo-600 hover:underline">
        Back to requests
      </Link>
    </div>
  );
}
