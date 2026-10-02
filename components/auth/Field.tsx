"use client";

import { useId, useState } from "react";

type Kind = "text" | "email" | "password";

const icons = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
};

export function Field({
  label,
  name,
  kind = "text",
  icon,
  error,
  defaultValue,
  autoComplete,
  labelAside,
  enterKeyHint,
}: {
  label: string;
  name: string;
  kind?: Kind;
  icon: keyof typeof icons;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
  labelAside?: React.ReactNode;
  enterKeyHint?: "next" | "go" | "done";
}) {
  const id = useId();
  const errId = `${id}-err`;
  const [show, setShow] = useState(false);
  const isPw = kind === "password";

  return (
    <div>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative mt-1.5">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          {icons[icon]}
        </svg>
        <input
          id={id}
          name={name}
          type={isPw && show ? "text" : kind}
          inputMode={kind === "email" ? "email" : undefined}
          autoComplete={autoComplete}
          autoCapitalize={kind === "text" ? "words" : "none"}
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={`block min-h-12 w-full rounded-2xl border bg-sunken py-3 pl-11 text-base text-ink placeholder:text-muted/70 focus-visible:border-brand-600 focus-visible:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
            isPw ? "pr-14" : "pr-4"
          } ${error ? "border-brand-500" : "border-line"}`}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="m4 4 16 16" />}
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p id={errId} role="alert" className="mt-1.5 text-sm text-brand-700">
          {error}
        </p>
      )}
    </div>
  );
}
