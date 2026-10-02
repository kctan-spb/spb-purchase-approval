"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createRequest } from "@/features/requests/actions";
import { CURRENCIES, DEFAULT_CURRENCY, parseAmount } from "@/lib/money";
import { ACCEPT_ATTR, MAX_FILES, MAX_TOTAL_BYTES, isAllowedFile } from "@/lib/attachment-rules";
import { formatBytes, formatMoney } from "@/lib/format";
import type { Category, FormState } from "@/lib/db/types";

const input = "field mt-1";
const FIELD_ORDER = ["title", "description", "amount", "amount_myr", "category", "vendor", "attachments"];

function Required() {
  return <span className="font-normal text-muted"> (required)</span>;
}
function Optional() {
  return <span className="font-normal text-muted"> (optional)</span>;
}
function Hint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm font-normal text-muted">
      {children}
    </p>
  );
}
function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} role="alert" className="mt-1 text-sm font-normal text-brand-700">
      {msg}
    </p>
  ) : null;
}

export function RequestForm({
  categories,
  attachmentRequiredOverMyr,
}: {
  categories: Category[];
  attachmentRequiredOverMyr: number;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRequest, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const id = (k: string) => `${uid}-${k}`;

  // One id per form so a double click or retry can never create the request twice.
  const [requestId, setRequestId] = useState("");
  useEffect(() => setRequestId(crypto.randomUUID()), []);

  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [amount, setAmount] = useState("");
  const [amountMyr, setAmountMyr] = useState("");
  const [fileNote, setFileNote] = useState<{ names: string[]; problem?: string }>({ names: [] });

  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const isMyr = currency === DEFAULT_CURRENCY;

  const typedAmount = parseAmount(isMyr ? amount : amountMyr);
  const needsAttachment = typedAmount.ok && typedAmount.value >= attachmentRequiredOverMyr;
  const threshold = formatMoney(attachmentRequiredOverMyr, "MYR");

  // After a failed submit, move focus to the first field with a problem.
  useEffect(() => {
    const errs = state.fieldErrors;
    if (!errs || !formRef.current) return;
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first) return;
    formRef.current.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const total = files.reduce((t, f) => t + f.size, 0);
    let problem: string | undefined;
    if (files.length > MAX_FILES) problem = `Attach at most ${MAX_FILES} files.`;
    else if (total > MAX_TOTAL_BYTES) problem = `These files total ${formatBytes(total)}. The limit is 4 MB in all.`;
    else if (files.some((f) => !isAllowedFile(f))) problem = "Only PDF, JPG, PNG or WebP files can be attached.";
    setFileNote({ names: files.map((f) => `${f.name} (${formatBytes(f.size)})`), problem });
  }

  const d = (k: string, hint?: boolean) =>
    [hint ? id(`${k}-hint`) : null, fe[k] ? id(`${k}-err`) : null].filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formRef} action={action} noValidate className="grid gap-4">
      {state.error && (
        <div role="alert" className="rounded-xl border border-brand-300 bg-brand-50 p-3 text-sm text-brand-800">
          {state.error}
        </div>
      )}
      <input type="hidden" name="request_id" value={v.request_id || requestId} />

      <label className="block text-sm font-semibold text-ink">
        Title
        <Required />
        <input
          name="title"
          defaultValue={v.title}
          className={input}
          maxLength={200}
          aria-invalid={!!fe.title}
          aria-describedby={d("title", true)}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
        />
        <Hint id={id("title-hint")}>A short name, for example &ldquo;Laptop for new hire&rdquo;.</Hint>
        <Err id={id("title-err")} msg={fe.title} />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Description
        <Required />
        <textarea
          name="description"
          rows={4}
          defaultValue={v.description}
          className={input}
          maxLength={4000}
          aria-invalid={!!fe.description}
          aria-describedby={d("description", true)}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        <Hint id={id("description-hint")}>What is needed, why, and anything the approver should know.</Hint>
        <Err id={id("description-err")} msg={fe.description} />
      </label>

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
        <label className="block text-sm font-semibold text-ink">
          Amount
          <Required />
          <input
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={input}
            aria-invalid={!!fe.amount}
            aria-describedby={d("amount", true)}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Currency
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={input}
            aria-invalid={!!fe.currency}
            aria-describedby={d("currency")}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="col-span-2 -mt-2">
          <Hint id={id("amount-hint")}>e.g. 1,200.50. Numbers only, up to 2 decimal places.</Hint>
          <Err id={id("amount-err")} msg={fe.amount} />
          <Err id={id("currency-err")} msg={fe.currency} />
        </div>
      </div>

      {!isMyr && (
        <label className="block text-sm font-semibold text-ink">
          Amount in MYR (approx.)
          <Required />
          <input
            name="amount_myr"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0.00"
            value={amountMyr}
            onChange={(e) => setAmountMyr(e.target.value)}
            className={input}
            aria-invalid={!!fe.amount_myr}
            aria-describedby={d("amount_myr", true)}
          />
          <Hint id={id("amount_myr-hint")}>
            Approvers decide in Ringgit, so give your best estimate of the {currency} amount in MYR.
          </Hint>
          <Err id={id("amount_myr-err")} msg={fe.amount_myr} />
        </label>
      )}

      <label className="block text-sm font-semibold text-ink">
        Category
        <Optional />
        <select
          name="category"
          defaultValue={v.category ?? ""}
          className={input}
          aria-invalid={!!fe.category}
          aria-describedby={d("category")}
        >
          <option value="">Select a category</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <Err id={id("category-err")} msg={fe.category} />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Vendor
        <Optional />
        <input
          name="vendor"
          defaultValue={v.vendor}
          className={input}
          maxLength={200}
          aria-invalid={!!fe.vendor}
          aria-describedby={d("vendor")}
          autoComplete="organization"
          autoCapitalize="words"
          enterKeyHint="done"
        />
        <Err id={id("vendor-err")} msg={fe.vendor} />
      </label>

      <div>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="routine"
            defaultChecked={v.routine === "on"}
            aria-describedby={id("routine-hint")}
            className="h-5 w-5 shrink-0 accent-brand-600"
          />
          Routine / recurring purchase
        </label>
        <Hint id={id("routine-hint")}>Tick if this repeats, e.g. monthly rent.</Hint>
      </div>

      <div>
        <label htmlFor={id("files")} className="block text-sm font-semibold text-ink">
          Attachments
          {needsAttachment ? <Required /> : <Optional />}
        </label>
        <input
          id={id("files")}
          name="attachments"
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          onChange={onFiles}
          aria-invalid={!!fe.attachments}
          aria-describedby={d("attachments", true)}
          className="field mt-1 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sunken file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
        />
        <Hint id={id("attachments-hint")}>
          Quotation or invoice. PDF, JPG, PNG or WebP, up to {MAX_FILES} files and 4 MB in total. Required for requests of{" "}
          {threshold} or more{needsAttachment ? " (this one is)" : ""}.
        </Hint>
        {fileNote.names.length > 0 && (
          <ul className="mt-1 text-sm text-ink">
            {fileNote.names.map((n) => (
              <li key={n} className="break-all">
                {n}
              </li>
            ))}
          </ul>
        )}
        {fileNote.problem && (
          <p role="alert" className="mt-1 text-sm text-brand-700">
            {fileNote.problem}
          </p>
        )}
        <Err id={id("attachments-err")} msg={fe.attachments} />
      </div>

      {/* Sticky on phones (thumb reach, respects the home-indicator inset); inline on >= md. */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-line bg-panel/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button type="submit" disabled={pending} className="btn-primary min-h-12 w-full px-4 py-2.5 text-base">
          {pending ? "Submitting..." : "Submit request"}
        </button>
      </div>
    </form>
  );
}
