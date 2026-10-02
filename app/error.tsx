"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-rose-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-rose-700">
        We couldn&apos;t load this page. If the database was just set up, give it a moment and retry.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
      >
        Try again
      </button>
    </div>
  );
}
