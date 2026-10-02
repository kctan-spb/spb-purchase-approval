"use client";

import { useActionState, useId, useState } from "react";
import { setUserRole } from "@/features/users/actions";
import { formatMoney } from "@/lib/format";
import type { FormState } from "@/lib/db/types";

const ROLES = [
  { value: "requester", label: "Staff" },
  { value: "approver", label: "Approver" },
  { value: "admin", label: "Admin" },
];

export function RoleForm({
  userId,
  role,
  limit,
  defaultLimit,
  isSelf,
}: {
  userId: string;
  role: string;
  /** This person's own approval limit in MYR (null = none set). */
  limit: number | null;
  defaultLimit: number;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(setUserRole.bind(null, userId), {});
  const [selected, setSelected] = useState(role);
  const uid = useId();
  const limitErr = state.fieldErrors?.limit;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2" noValidate>
      <select
        name="role"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        aria-label="Role"
        className="field w-auto"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {selected === "approver" && (
        <div className="w-full sm:w-auto">
          <label htmlFor={`${uid}-limit`} className="block text-xs font-semibold text-muted">
            Approval limit (RM)
          </label>
          <input
            id={`${uid}-limit`}
            name="limit"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={limit !== null ? String(limit) : ""}
            placeholder={`Default ${formatMoney(defaultLimit, "MYR").replace("RM ", "")}`}
            aria-describedby={`${uid}-limit-hint${limitErr ? ` ${uid}-limit-err` : ""}`}
            aria-invalid={!!limitErr}
            className="field w-full sm:w-44"
          />
          <p id={`${uid}-limit-hint`} className="mt-1 text-xs text-muted">
            Leave blank to use the default ({formatMoney(defaultLimit, "MYR")}).
          </p>
          {limitErr && (
            <p id={`${uid}-limit-err`} role="alert" className="text-sm text-brand-700">
              {limitErr}
            </p>
          )}
        </div>
      )}
      <button
        disabled={pending}
        className="btn-primary px-4"
        onClick={(e) => {
          if (isSelf && !confirm("You are changing your own role. Continue?")) e.preventDefault();
        }}
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {state.values?.role && !state.error && !limitErr && (
        <span role="status" className="text-sm text-emerald-800">
          Saved. It applies from their next page load.
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
