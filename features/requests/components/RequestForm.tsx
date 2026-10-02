"use client";

import { useActionState } from "react";
import { createRequest } from "@/features/requests/actions";
import type { Category, FormState } from "@/lib/db/types";

const CURRENCIES = ["USD", "MYR", "SGD", "EUR", "GBP"];
const input =
  "field mt-1";

function Err({ msg }: { msg?: string }) {
  return msg ? (
    <p role="alert" className="mt-1 text-sm text-brand-700">
      {msg}
    </p>
  ) : null;
}

export function RequestForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRequest, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-4">
      {state.error && (
        <div role="alert" className="rounded-xl border border-brand-300 bg-brand-50 p-3 text-sm text-brand-800">
          {state.error}
        </div>
      )}

      <label className="block text-sm font-semibold text-ink">
        Title *
        <input
          name="title"
          defaultValue={v.title}
          className={input}
          aria-invalid={!!fe.title}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
        />
        <Err msg={fe.title} />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Description *
        <textarea
          name="description"
          rows={4}
          defaultValue={v.description}
          className={input}
          aria-invalid={!!fe.description}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        <Err msg={fe.description} />
      </label>

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
        <label className="block text-sm font-semibold text-ink">
          Amount *
          <input
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0.00"
            defaultValue={v.amount}
            className={input}
            aria-invalid={!!fe.amount}
          />
          <Err msg={fe.amount} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Currency
          <select name="currency" defaultValue={v.currency || "USD"} className={input}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-semibold text-ink">
        Category
        <select name="category" defaultValue={v.category ?? ""} className={input}>
          <option value="">— Select a category —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Vendor
        <input
          name="vendor"
          defaultValue={v.vendor}
          className={input}
          autoComplete="organization"
          autoCapitalize="words"
          enterKeyHint="done"
        />
      </label>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" name="routine" defaultChecked={v.routine === "on"} className="h-5 w-5 shrink-0 accent-brand-600" />
        Routine / recurring purchase
      </label>

      {/* Sticky on phones (thumb reach, respects the home-indicator inset); inline on >= md. */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-line bg-panel/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary min-h-12 w-full px-4 py-2.5 text-base"
        >
          {pending ? "Submitting..." : "Submit request"}
        </button>
      </div>
    </form>
  );
}
