// Plain link: the browser downloads the CSV from the export route (needs a signed-in session).
export function ExportButton({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="btn-secondary shrink-0 gap-2 px-4"
    >
      <span aria-hidden="true">↓</span>
      {label}
    </a>
  );
}
