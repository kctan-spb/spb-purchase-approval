// Plain link: the browser downloads the CSV from the export route (needs a signed-in session).
export function ExportButton({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span aria-hidden="true">↓</span>
      {label}
    </a>
  );
}
