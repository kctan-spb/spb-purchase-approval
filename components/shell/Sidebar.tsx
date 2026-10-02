"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/login/actions";

type ShellUser = { name: string; email: string; role: string; canApprove: boolean };

const NAV: { href: string; label: string; approverOnly?: boolean }[] = [
  { href: "/", label: "Requests" },
  { href: "/requests/new", label: "New Request" },
  { href: "/approvals", label: "Approvals", approverOnly: true },
  { href: "/categories", label: "Categories" },
  { href: "/audit", label: "Audit" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || /^\/requests\/(?!new)/.test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {NAV.filter((n) => !n.approverOnly || user.canApprove).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className={`rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            isActive(pathname, n.href)
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-100"
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
          <button className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-left hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar + hamburger */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-semibold text-slate-900">Purchase Approvals</span>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          ☰
        </button>
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3 font-semibold">Menu</div>
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
