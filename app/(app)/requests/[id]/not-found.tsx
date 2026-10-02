import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <p className="eyebrow">Requests</p>
      <h1 className="text-2xl font-semibold text-ink">Request not found</h1>
      <p className="mt-2 text-muted">It may have been removed or the link is wrong.</p>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline">
        Back to requests
      </Link>
    </div>
  );
}
