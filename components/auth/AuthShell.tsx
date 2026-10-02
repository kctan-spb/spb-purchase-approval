import { BrandMark } from "@/components/BrandMark";

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** Soft hexagon tint for the hero band (decorative only). */
function Hexagons() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full text-brand-600" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hex" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="translate(20 -10)">
          <path
            d="M28 2 52 16v28L28 58 4 44V16Z M28 50 52 64v28L28 106 4 92V64Z"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1.2"
          />
          <path d="M28 2 52 16v28L28 58 4 44V16Z" fill="currentColor" fillOpacity="0.035" />
        </pattern>
        <linearGradient id="hexfade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id="hexmask">
          <rect width="100%" height="100%" fill="url(#hexfade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" mask="url(#hexmask)" />
    </svg>
  );
}

export function AuthShell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <header className="relative overflow-hidden border-b border-line bg-brand-50 px-6 pb-16 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-10 lg:flex lg:items-center lg:border-b-0 lg:border-r lg:px-14 lg:pb-10 lg:pt-10">
        <Hexagons />
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <BrandMark size={56} className="drop-shadow-sm" />
          <p className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <ShieldIcon />
            <span>Staff purchase requests</span>
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Purchase Approvals
          </h1>
          <p className="mt-2 text-lg text-muted">{subtitle}</p>
        </div>
      </header>

      <section className="relative -mt-8 flex flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:mt-0 lg:items-center lg:justify-center lg:px-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-[0_12px_32px_-12px_rgba(42,36,34,0.18)] sm:p-8 lg:my-10">
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-muted lg:absolute lg:bottom-6 lg:left-0 lg:right-0 lg:mt-0">
          Selangor Properties. Authorised staff only.
        </p>
      </section>
    </main>
  );
}

export const primaryButton =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-base font-semibold text-white shadow-[0_8px_18px_-6px_rgba(176,30,35,0.55)] transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-900 disabled:shadow-none";

export const linkClass =
  "inline-flex min-h-11 items-center rounded-md font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600";

export function ErrorAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
      {children}
    </div>
  );
}

export function NoticeAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-xl border border-line bg-sunken p-3 text-sm text-ink">
      {children}
    </div>
  );
}
