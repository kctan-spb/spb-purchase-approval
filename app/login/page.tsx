"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";
import type { FormState } from "@/lib/db/types";

const input =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white min-h-11 px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState<FormState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<FormState, FormData>(signUp, {});
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;
  const fe = state.fieldErrors ?? {};

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Purchase Approvals</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "in" ? "Sign in to continue." : "Create your account."}
        </p>

        <form action={mode === "in" ? inAction : upAction} noValidate className="mt-5 grid gap-4" key={mode}>
          {state.error && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {state.error}
            </div>
          )}
          {fe.notice && (
            <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {fe.notice}
            </div>
          )}
          {mode === "up" && (
            <label className="block text-sm font-medium">
              Full name
              <input name="name" autoComplete="name" autoCapitalize="words" enterKeyHint="next" defaultValue={state.values?.name} className={input} />
              {fe.name && <p role="alert" className="mt-1 text-sm text-rose-600">{fe.name}</p>}
            </label>
          )}
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" defaultValue={state.values?.email} className={input} />
            {fe.email && <p role="alert" className="mt-1 text-sm text-rose-600">{fe.email}</p>}
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              enterKeyHint="go"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              className={input}
            />
            {fe.password && <p role="alert" className="mt-1 text-sm text-rose-600">{fe.password}</p>}
          </label>
          <button
            disabled={pending}
            className="min-h-12 rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Please wait..." : mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-3 inline-flex min-h-11 items-center text-sm text-indigo-600 hover:underline"
        >
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
