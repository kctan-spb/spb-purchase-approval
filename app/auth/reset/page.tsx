"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword } from "./actions";
import type { FormState } from "@/lib/db/types";
import { AuthShell, ErrorAlert, linkClass, primaryButton } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";

export default function ResetPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, {});
  const fe = state.fieldErrors ?? {};

  return (
    <AuthShell subtitle="Choose a new password.">
      <form action={action} noValidate className="grid gap-5">
        {state.error && <ErrorAlert>{state.error}</ErrorAlert>}
        <Field label="New password" name="password" kind="password" icon="lock" autoComplete="new-password" enterKeyHint="next" error={fe.password} />
        <Field label="Confirm new password" name="confirm" kind="password" icon="lock" autoComplete="new-password" enterKeyHint="go" error={fe.confirm} />
        <p className="-mt-2 text-sm text-muted">Use at least 8 characters.</p>
        <button disabled={pending} className={primaryButton}>
          {pending ? "Please wait..." : "Update password →"}
        </button>
      </form>
      <p className="mt-5 text-center">
        <Link href="/login" className={linkClass}>
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
