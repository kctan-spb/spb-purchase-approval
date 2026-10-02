"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp } from "./actions";
import type { FormState } from "@/lib/db/types";
import { AuthShell, ErrorAlert, NoticeAlert, linkClass, primaryButton } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/email-domain";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState<FormState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<FormState, FormData>(signUp, {});
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;
  const fe = state.fieldErrors ?? {};

  return (
    <AuthShell subtitle={mode === "in" ? "Sign in to continue." : "Create your account."}>
      <form action={mode === "in" ? inAction : upAction} noValidate className="grid gap-5" key={mode}>
        {state.error && <ErrorAlert>{state.error}</ErrorAlert>}
        {fe.notice && <NoticeAlert>{fe.notice}</NoticeAlert>}
        {mode === "up" && (
          <Field label="Full name" name="name" icon="user" autoComplete="name" enterKeyHint="next" defaultValue={state.values?.name} error={fe.name} />
        )}
        <Field
          label="Email"
          name="email"
          kind="email"
          icon="mail"
          autoComplete="email"
          enterKeyHint="next"
          defaultValue={state.values?.email}
          error={fe.email}
          hint={mode === "up" ? `Use your @${ALLOWED_EMAIL_DOMAIN} email` : undefined}
        />
        <Field
          label="Password"
          name="password"
          kind="password"
          icon="lock"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          enterKeyHint="go"
          error={fe.password}
          labelAside={
            mode === "in" ? (
              <Link href="/login/forgot" className={`${linkClass} text-sm`}>
                Forgot password?
              </Link>
            ) : undefined
          }
        />
        {mode === "up" && <p className="-mt-3 text-sm text-muted">Use at least 8 characters.</p>}
        <button disabled={pending} className={primaryButton}>
          {pending ? "Please wait..." : mode === "in" ? "Sign in →" : "Create account →"}
        </button>
      </form>

      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm text-muted">
        {mode === "in" ? "No account?" : "Have an account?"}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className={linkClass}>
          {mode === "in" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </AuthShell>
  );
}
