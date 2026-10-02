"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl card mt-4 border-brand-300 bg-brand-50 p-6 text-center">
      <p className="eyebrow">Error</p>
      <h1 className="text-xl font-semibold text-brand-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-brand-800">
        We couldn&apos;t load this page. If the database was just set up, give it a moment and retry.
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-primary mt-4"
      >
        Try again
      </button>
    </div>
  );
}
