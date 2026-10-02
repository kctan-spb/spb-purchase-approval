"use client";

import { useActionState } from "react";
import { setUserRole } from "@/features/users/actions";
import type { FormState } from "@/lib/db/types";

const ROLES = [
  { value: "requester", label: "Requester" },
  { value: "approver", label: "Approver" },
  { value: "admin", label: "Admin" },
];

export function RoleForm({ userId, role, isSelf }: { userId: string; role: string; isSelf: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setUserRole.bind(null, userId), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <select
        name="role"
        defaultValue={role}
        aria-label="Role"
        className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        onClick={(e) => {
          if (isSelf && !confirm("You are changing your own role. Continue?")) e.preventDefault();
        }}
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {state.values?.role && !state.error && (
        <span role="status" className="text-sm text-emerald-700">
          Saved. They need to sign out and back in.
        </span>
      )}
      {state.error && (
        <span role="alert" className="w-full text-sm text-rose-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
