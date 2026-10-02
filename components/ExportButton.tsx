// Plain link to the export route (needs a signed-in session). No `download` attribute on purpose: a
// successful export is served as an attachment and downloads, while a refusal (for example "too many
// rows, choose a shorter time frame") is shown as a readable page instead of a silent failed download.
export function ExportButton({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <a href={href} className="btn-secondary shrink-0 gap-2 px-4">
      <span aria-hidden="true">↓</span>
      {label}
    </a>
  );
}
