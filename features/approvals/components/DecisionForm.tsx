"use client";

import { useActionState, useRef } from "react";
import { decideRequest } from "@/features/approvals/actions";
import type { FormState } from "@/lib/db/types";

const input =
  "field mt-1";

export function DecisionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    decideRequest.bind(null, requestId),
    {},
  );
  const decisionRef = useRef<HTMLInputElement>(null);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} noValidate className="card grid gap-3 p-4 sm:p-5">
      <div>
        <p className="eyebrow">Decision</p>
        <h2 className="text-lg font-semibold text-ink">Approve or reject</h2>
      </div>
      {state.error && (
        <div role="alert" className="rounded-xl border border-brand-300 bg-brand-50 p-3 text-sm text-brand-800">
          {state.error}
        </div>
      )}
      <input ref={decisionRef} type="hidden" name="decision" defaultValue="approved" />

      <label className="block text-sm font-semibold text-ink">
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
          <p role="alert" className="mt-1 text-sm text-brand-700">
            {fe.comment}
          </p>
        )}
      </label>

      {/* Fixed to the bottom on phones so Approve/Reject are always in thumb reach; inline on >= md.
          The page reserves matching bottom padding (see requests/[id]/page.tsx). */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-line bg-panel/95 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          onClick={() => decisionRef.current && (decisionRef.current.value = "approved")}
          className="btn min-h-12 flex-1 bg-emerald-700 px-4 py-2.5 text-base text-white shadow-[0_4px_12px_-4px_rgba(4,120,87,0.5)] hover:bg-emerald-800"
        >
          {pending ? "Saving..." : "Approve"}
        </button>
        <button
          type="submit"
          disabled={pending}
          onClick={() => decisionRef.current && (decisionRef.current.value = "rejected")}
          className="btn-primary min-h-12 flex-1 px-4 py-2.5 text-base"
        >
          {pending ? "Saving..." : "Reject"}
        </button>
      </div>
    </form>
  );
}
