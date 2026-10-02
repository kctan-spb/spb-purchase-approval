"use client";

import { useActionState } from "react";
import { createRequest } from "@/features/requests/actions";
import type { Category, FormState } from "@/lib/db/types";

const CURRENCIES = ["USD", "MYR", "SGD", "EUR", "GBP"];
const input =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Err({ msg }: { msg?: string }) {
  return msg ? (
    <p role="alert" className="mt-1 text-sm text-rose-600">
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
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <label className="block text-sm font-medium">
        Title *
        <input name="title" defaultValue={v.title} className={input} aria-invalid={!!fe.title} />
        <Err msg={fe.title} />
      </label>

      <label className="block text-sm font-medium">
        Description *
        <textarea
          name="description"
          rows={4}
          defaultValue={v.description}
          className={input}
          aria-invalid={!!fe.description}
        />
        <Err msg={fe.description} />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 block text-sm font-medium">
          Amount *
          <input
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={v.amount}
            className={input}
            aria-invalid={!!fe.amount}
          />
          <Err msg={fe.amount} />
        </label>
        <label className="block text-sm font-medium">
          Currency
          <select name="currency" defaultValue={v.currency || "USD"} className={input}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium">
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

      <label className="block text-sm font-medium">
        Vendor
        <input name="vendor" defaultValue={v.vendor} className={input} />
      </label>

      <label className="block text-sm font-medium">
        Your name
        <input name="requester" defaultValue={v.requester} className={input} placeholder="Recorded in the audit trail" />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="routine" defaultChecked={v.routine === "on"} className="h-4 w-4" />
        Routine / recurring purchase
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
