"use client";

import { useActionState } from "react";
import { createOrganization, joinOrganization } from "@/features/orgs/actions";
import { signOut } from "@/app/login/actions";
import type { FormState } from "@/lib/db/types";

const input =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const button =
  "rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60";

export default function OnboardingPage() {
  const [createState, createAction, creating] = useActionState<FormState, FormData>(createOrganization, {});
  const [joinState, joinAction, joining] = useActionState<FormState, FormData>(joinOrganization, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-xl font-semibold">Set up your organization</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new organization for your team, or join an existing one with an invite code.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <form action={createAction} noValidate className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Create an organization</h2>
            {createState.error && (
              <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {createState.error}
              </div>
            )}
            <label className="block text-sm font-medium">
              Organization name
              <input name="name" defaultValue={createState.values?.name} className={input} />
              {createState.fieldErrors?.name && (
                <p role="alert" className="mt-1 text-sm text-rose-600">{createState.fieldErrors.name}</p>
              )}
            </label>
            <p className="text-xs text-slate-500">You will be the admin and can share an invite code with your team.</p>
            <button disabled={creating} className={button}>
              {creating ? "Creating..." : "Create organization"}
            </button>
          </form>

          <form action={joinAction} noValidate className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Join with an invite code</h2>
            {joinState.error && (
              <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {joinState.error}
              </div>
            )}
            <label className="block text-sm font-medium">
              Invite code
              <input name="code" autoComplete="off" defaultValue={joinState.values?.code} className={input} />
              {joinState.fieldErrors?.code && (
                <p role="alert" className="mt-1 text-sm text-rose-600">{joinState.fieldErrors.code}</p>
              )}
            </label>
            <p className="text-xs text-slate-500">You will join as a requester. An admin can change your role.</p>
            <button disabled={joining} className={button}>
              {joining ? "Joining..." : "Join organization"}
            </button>
          </form>
        </div>

        <form action={signOut} className="mt-4">
          <button className="text-sm text-indigo-600 hover:underline">Sign out</button>
        </form>
      </div>
    </div>
  );
}
