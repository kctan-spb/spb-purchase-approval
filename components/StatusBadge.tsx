const STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-300",
  approved: "bg-emerald-50 text-emerald-900 ring-emerald-300",
  rejected: "bg-brand-50 text-brand-800 ring-brand-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
        STYLES[status] ?? "bg-sunken text-ink ring-line"
      }`}
    >
      {status}
    </span>
  );
}
