export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading...</span>
      <div className="mb-6 h-8 w-56 max-w-full rounded bg-slate-200 motion-safe:animate-pulse" />
      <div className="grid gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-200 motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
