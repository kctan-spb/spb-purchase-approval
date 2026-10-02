"use client";

import { useActionState, useRef } from "react";
import { decideRequest } from "@/features/approvals/actions";
import type { FormState } from "@/lib/db/types";

const input =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function DecisionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    decideRequest.bind(null, requestId),
    {},
  );
  const decisionRef = useRef<HTMLInputElement>(null);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} noValidate className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Decision</h2>
      {state.error && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}
      <input ref={decisionRef} type="hidden" name="decision" defaultValue="approved" />

      <label className="block text-sm font-medium">
        Your name *
        <input name="approver" defaultValue={v.approver} className={input} />
        {fe.approver && (
          <p role="alert" className="mt-1 text-sm text-rose-600">
            {fe.approver}
          </p>
        )}
      </label>

      <label className="block text-sm font-medium">
        Comment
        <textarea name="comment" rows={3} defaultValue={v.comment} className={input} />
        {fe.comment && (
          <p role="alert" className="mt-1 text-sm text-rose-600">
            {fe.comment}
          </p>
        )}
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          onClick={() => decisionRef.current && (decisionRef.current.value = "approved")}
          className="flex-1 rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Approve"}
        </button>
        <button
          type="submit"
          disabled={pending}
          onClick={() => decisionRef.current && (decisionRef.current.value = "rejected")}
          className="flex-1 rounded-md bg-rose-600 px-4 py-2.5 font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Reject"}
        </button>
      </div>
    </form>
  );
}
