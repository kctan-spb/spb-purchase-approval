"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import { switchOrganization } from "@/features/orgs/actions";

type ShellUser = { name: string; email: string; role: string; canApprove: boolean };

const NAV: { href: string; label: string; approverOnly?: boolean }[] = [
  { href: "/", label: "Requests" },
  { href: "/requests/new", label: "New Request" },
  { href: "/approvals", label: "Approvals", approverOnly: true },
  { href: "/categories", label: "Categories" },
  { href: "/audit", label: "Audit" },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || /^\/requests\/(?!new)/.test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

type ShellOrg = { id: string; name: string; inviteCode: string | null };

export function Sidebar({
  user,
  org,
  orgs,
}: {
  user: ShellUser;
  org: ShellOrg;
  orgs: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // While open: scroll lock, Escape, focus trap, focus restore, close when resized to desktop.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!drawerRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    const button = menuButtonRef.current;
    return () => {
      html.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      button?.focus({ preventScroll: true });
    };
  }, [open]);

  const links = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      <div className="mb-2 rounded-md bg-slate-50 p-2 text-sm">
        {orgs.length > 1 ? (
          <form action={switchOrganization}>
            <label className="block text-xs uppercase tracking-wide text-slate-500">
              Organization
              <select
                name="orgId"
                defaultValue={org.id}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm normal-case text-slate-900"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </form>
        ) : (
          <p className="truncate font-medium text-slate-900" title={org.name}>
            {org.name}
          </p>
        )}
        {org.inviteCode && (
          <p className="mt-1 text-xs text-slate-500">
            Invite code: <code className="select-all font-mono text-slate-800">{org.inviteCode}</code>
          </p>
        )}
        <Link href="/onboarding" className="mt-1 block text-xs text-indigo-600 hover:underline">
          Create or join another
        </Link>
      </div>
      {NAV.filter((n) => !n.approverOnly || user.canApprove).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={close}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            isActive(pathname, n.href)
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-100 active:bg-slate-100"
          }`}
        >
          {n.label}
        </Link>
      ))}
      <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
        <p className="truncate font-medium text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">
          {user.email} · {user.role}
        </p>
        <form action={signOut}>
          <button className="mt-2 flex min-h-11 w-full items-center rounded-md border border-slate-300 px-3 py-1.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar + hamburger */}
      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:hidden">
        <span className="min-w-0 truncate font-semibold text-slate-900">Purchase Approvals</span>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(true)}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 text-xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40 motion-safe:animate-[fade-in_150ms_ease-out]"
            onClick={close}
          />
          <div
            ref={drawerRef}
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-xl motion-safe:animate-[drawer-in_200ms_ease-out]"
          >
            <div className="flex min-h-14 items-center justify-between border-b border-slate-200 pl-4 pr-2 font-semibold">
              Menu
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-md text-xl leading-none hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            {links}
          </div>
        </div>
      )}
      {/* Desktop / tablet sidebar */}
      <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-white md:block lg:w-60">
        <div className="sticky top-0">
          <div className="border-b border-slate-200 px-4 py-4 font-semibold text-slate-900">
            Purchase Approvals
          </div>
          {links}
        </div>
      </aside>
    </>
  );
}
