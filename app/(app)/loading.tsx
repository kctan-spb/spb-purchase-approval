export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading...</span>
      <div className="mb-2 h-3 w-24 rounded-full bg-line motion-safe:animate-pulse" />
      <div className="mb-6 h-9 w-64 max-w-full rounded-xl bg-line motion-safe:animate-pulse" />
      <div className="grid gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-line bg-sunken motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
