"use client";

import { useActionState, useState } from "react";
import { createCategory, deleteCategory, renameCategory } from "@/features/categories/actions";
import type { Category, FormState } from "@/lib/db/types";

const input =
  "block w-full rounded-md border border-slate-300 bg-white min-h-11 px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function AddForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCategory, {});
  return (
    <form action={action} className="mb-6" noValidate key={state.values ? "ok" : "err"}>
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="New category name"
          className={`${input} min-w-0 flex-1`}
          defaultValue={state.values?.name}
          aria-label="New category name"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
        />
        <button disabled={pending} className="min-h-11 shrink-0 rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {pending ? "Adding..." : "Add"}
        </button>
      </div>
      {(state.fieldErrors?.name || state.error) && (
        <p role="alert" className="mt-1 text-sm text-rose-600">{state.fieldErrors?.name ?? state.error}</p>
      )}
    </form>
  );
}

function Row({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await renameCategory(category.id, prev, fd);
      if (!res.error && !res.fieldErrors) setEditing(false);
      return res;
    },
    {},
  );

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
      {editing ? (
        <form action={action} className="flex flex-1 flex-wrap items-center gap-2" noValidate>
          <input
            name="name"
            defaultValue={category.name}
            className={`${input} min-w-0 flex-1 basis-full sm:basis-0`}
            aria-label="Category name"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            autoFocus
          />
          <button disabled={pending} className="min-h-11 rounded-md bg-indigo-600 px-5 py-1.5 text-sm text-white">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-md border border-slate-300 px-5 py-1.5 text-sm">Cancel</button>
          {(state.fieldErrors?.name || state.error) && (
            <p role="alert" className="w-full text-sm text-rose-600">{state.fieldErrors?.name ?? state.error}</p>
          )}
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1 font-medium break-words">{category.name}</span>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-md border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50">Edit</button>
            <form
              action={deleteCategory.bind(null, category.id)}
              onSubmit={(e) => {
                if (!confirm(`Delete category "${category.name}"? Existing requests keep their label.`)) e.preventDefault();
              }}
            >
              <button className="min-h-11 rounded-md border border-rose-300 px-4 py-1.5 text-sm text-rose-700 hover:bg-rose-50">Delete</button>
            </form>
          </div>
        </>
      )}
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div>
      <AddForm />
      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
          No categories yet. Add one above.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {categories.map((c) => (
            <Row key={c.id} category={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
