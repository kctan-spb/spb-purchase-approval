"use client";

import { useActionState, useId, useRef, useState } from "react";
import { decideRequest } from "@/features/approvals/actions";
import type { FormState } from "@/lib/db/types";

export function DecisionForm({
  requestId,
  amountLabel,
  vendor,
  requester,
  largeAmount,
}: {
  requestId: string;
  /** Formatted amount, e.g. "RM 12,000.00". */
  amountLabel: string;
  vendor: string | null;
  requester: string;
  /** True when approving needs an explicit confirmation and a comment (large or unknown MYR value). */
  largeAmount: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    decideRequest.bind(null, requestId),
    {},
  );
  const uid = useId();
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [comment, setComment] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fe = state.fieldErrors ?? {};
  const commentErr = localError ?? fe.comment;
  const errId = `${uid}-comment-err`;

  function needComment(message: string) {
    setLocalError(message);
    commentRef.current?.focus();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Client-side check for a friendlier message; the server and database check again.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "rejected" && !comment.trim()) {
      e.preventDefault();
      needComment("A reason is required when rejecting.");
    } else if (submitter?.value === "approved" && largeAmount && !comment.trim()) {
      e.preventDefault();
      needComment("Add a comment to confirm this approval.");
    } else {
      setLocalError(null);
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="card grid gap-3 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Your decision</h2>
      </div>
      {state.error && (
        <div role="alert" className="rounded-xl border border-brand-300 bg-brand-50 p-3 text-sm text-brand-800">
          {state.error}
          {state.code === "already_decided" && (
            <>
              {" "}
              <a href={`/requests/${requestId}`} className="font-semibold underline">
                Refresh now
              </a>
            </>
          )}
        </div>
      )}

      {confirming && (
        <div role="alertdialog" aria-labelledby={`${uid}-confirm`} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p id={`${uid}-confirm`} className="font-semibold">
            Confirm approval of {amountLabel}
          </p>
          <p className="mt-1">
            Vendor: {vendor || "not stated"}. Requested by {requester}. Add a comment below, then press Confirm approval.
            This cannot be undone.
          </p>
        </div>
      )}

      <div>
        <label htmlFor={`${uid}-comment`} className="block text-sm font-semibold text-ink">
          Comment
          <span className="font-normal text-muted">
            {confirming ? " (required)" : largeAmount ? " (required to approve; always required to reject)" : " (required to reject)"}
          </span>
        </label>
        <textarea
          id={`${uid}-comment`}
          ref={commentRef}
          name="comment"
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="field mt-1"
          aria-invalid={!!commentErr}
          aria-describedby={commentErr ? errId : undefined}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        {commentErr && (
          <p id={errId} role="alert" className="mt-1 text-sm text-brand-700">
            {commentErr}
          </p>
        )}
      </div>

      {/* Fixed to the bottom on phones so the buttons are always in thumb reach (stacked, with a gap, to avoid
          mis-taps); side by side with a wide gap on >= md. The page reserves matching bottom padding. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-3 border-t border-line bg-panel/95 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur md:static md:z-auto md:flex-row md:justify-start md:gap-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {confirming ? (
          <>
            <button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
              className="btn min-h-12 bg-emerald-800 px-6 py-2.5 text-base text-white hover:bg-emerald-900 disabled:bg-emerald-900 md:min-w-44"
            >
              {pending ? "Saving..." : "Confirm approval"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                setLocalError(null);
              }}
              className="btn-secondary min-h-12 px-6 py-2.5 text-base md:min-w-32"
            >
              Back
            </button>
          </>
        ) : (
          <>
            {largeAmount ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirming(true);
                  setLocalError(null);
                  commentRef.current?.focus();
                }}
                className="btn min-h-12 bg-emerald-800 px-6 py-2.5 text-base text-white hover:bg-emerald-900 disabled:bg-emerald-900 md:min-w-44"
              >
                Approve
              </button>
            ) : (
              <button
                type="submit"
                name="decision"
                value="approved"
                disabled={pending}
                className="btn min-h-12 bg-emerald-800 px-6 py-2.5 text-base text-white hover:bg-emerald-900 disabled:bg-emerald-900 md:min-w-44"
              >
                {pending ? "Saving..." : "Approve"}
              </button>
            )}
            <button
              type="submit"
              name="decision"
              value="rejected"
              disabled={pending}
              className="btn-danger min-h-12 px-6 py-2.5 text-base md:min-w-44"
            >
              {pending ? "Saving..." : "Reject"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
