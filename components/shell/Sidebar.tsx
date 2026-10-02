"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";

type ShellUser = { name: string; email: string; role: string; canApprove: boolean; isAdmin: boolean };

const NAV: { href: string; label: string; approverOnly?: boolean; adminOnly?: boolean }[] = [
  { href: "/", label: "Requests" },
  { href: "/requests/new", label: "New Request" },
  { href: "/approvals", label: "Approvals", approverOnly: true },
  { href: "/categories", label: "Categories" },
  { href: "/audit", label: "Audit" },
  { href: "/users", label: "Users", adminOnly: true },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || /^\/requests\/(?!new)/.test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ user }: { user: ShellUser }) {
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
      {NAV.filter((n) => (!n.approverOnly || user.canApprove) && (!n.adminOnly || user.isAdmin)).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={close}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel ${
            isActive(pathname, n.href)
              ? "bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(176,30,35,0.55)]"
              : "text-ink hover:bg-sunken active:bg-sunken"
          }`}
        >
          {n.label}
        </Link>
      ))}
      <div className="mt-4 border-t border-line px-1 pt-3 text-sm">
        <p className="truncate font-semibold text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">
          {user.email} · {user.role}
        </p>
        <form action={signOut}>
          <button className="btn-secondary mt-2 w-full justify-start px-4">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar + hamburger */}
      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-panel pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <BrandMark size={32} className="shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="eyebrow block truncate !text-[0.65rem]">Selangor Properties</span>
            <span className="block truncate text-base font-semibold text-ink">Purchase Approvals</span>
          </span>
        </span>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(true)}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-xl leading-none text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-panel pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-2xl motion-safe:animate-[drawer-in_200ms_ease-out]"
          >
            <div className="flex min-h-14 items-center justify-between border-b border-line pl-4 pr-2 font-semibold text-ink">
              <span className="eyebrow">Menu</span>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-xl leading-none hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            {links}
          </div>
        </div>
      )}
      {/* Desktop / tablet sidebar */}
      <aside className="hidden w-52 shrink-0 border-r border-line bg-panel md:block lg:w-64">
        <div className="sticky top-0">
          <div className="flex items-center gap-3 border-b border-line px-4 py-5">
            <BrandMark size={40} className="shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="eyebrow !text-[0.65rem]">Selangor Properties</p>
              <p className="text-lg font-semibold text-ink">Purchase Approvals</p>
            </div>
          </div>
          {links}
        </div>
      </aside>
    </>
  );
}
