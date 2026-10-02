"use client";

import { useActionState, useRef } from "react";
import { decideRequest } from "@/features/approvals/actions";
import type { FormState } from "@/lib/db/types";

const input =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white min-h-11 px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

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
        Comment
        <textarea
          name="comment"
          rows={3}
          defaultValue={v.comment}
          className={input}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        {fe.comment && (
          <p role="alert" className="mt-1 text-sm text-rose-600">
            {fe.comment}
          </p>
        )}
      </label>

      {/* Fixed to the bottom on phones so Approve/Reject are always in thumb reach; inline on >= md.
          The page reserves matching bottom padding (see requests/[id]/page.tsx). */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-slate-200 bg-white/95 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          onClick={() => decisionRef.current && (decisionRef.current.value = "approved")}
          className="min-h-12 flex-1 rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Approve"}
        </button>
        <button
          type="submit"
          disabled={pending}
          onClick={() => decisionRef.current && (decisionRef.current.value = "rejected")}
          className="min-h-12 flex-1 rounded-md bg-rose-600 px-4 py-2.5 font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Reject"}
        </button>
      </div>
    </form>
  );
}
