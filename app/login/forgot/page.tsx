"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestReset } from "./actions";
import type { FormState } from "@/lib/db/types";
import { AuthShell, NoticeAlert, linkClass, primaryButton } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";

export default function ForgotPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestReset, {});
  const fe = state.fieldErrors ?? {};

  return (
    <AuthShell subtitle="Reset your password.">
      <p className="mb-5 text-sm text-muted">
        Enter your work email and we will send you a link to choose a new password.
      </p>
      <form action={action} noValidate className="grid gap-5">
        {fe.notice && <NoticeAlert>{fe.notice}</NoticeAlert>}
        <Field label="Email" name="email" kind="email" icon="mail" autoComplete="email" enterKeyHint="go" defaultValue={state.values?.email} error={fe.email} />
        <button disabled={pending} className={primaryButton}>
          {pending ? "Please wait..." : "Send reset link →"}
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
