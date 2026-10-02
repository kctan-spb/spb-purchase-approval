import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequest } from "@/features/requests/data";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRequest(id);
  if (!r) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Amount", formatMoney(r.amount, r.currency)],
    ["Category", r.category ?? "—"],
    ["Vendor", r.vendor ?? "—"],
    ["Routine", r.routine ? "Yes" : "No"],
    ["Submitted", formatDate(r.created_at)],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← All requests
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{r.title}</h1>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-slate-700">{r.description}</p>
      <dl className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
            <dd className="mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
