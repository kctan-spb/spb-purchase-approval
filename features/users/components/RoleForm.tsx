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
        className="field w-auto"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        disabled={pending}
        className="btn-primary px-4"
        onClick={(e) => {
          if (isSelf && !confirm("You are changing your own role. Continue?")) e.preventDefault();
        }}
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {state.values?.role && !state.error && (
        <span role="status" className="text-sm text-emerald-800">
          Saved. They need to sign out and back in.
        </span>
      )}
      {state.error && (
        <span role="alert" className="w-full text-sm text-brand-700">
          {state.error}
        </span>
      )}
    </form>
  );
}
