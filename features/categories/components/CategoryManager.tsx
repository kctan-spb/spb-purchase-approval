"use client";

import { useActionState, useState } from "react";
import { createCategory, deleteCategory, renameCategory } from "@/features/categories/actions";
import type { Category, FormState } from "@/lib/db/types";

const input =
  "field";

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
        <button disabled={pending} className="btn-primary shrink-0">
          {pending ? "Adding..." : "Add"}
        </button>
      </div>
      {(state.fieldErrors?.name || state.error) && (
        <p role="alert" className="mt-1 text-sm text-brand-700">{state.fieldErrors?.name ?? state.error}</p>
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
    <li className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3">
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
          <button disabled={pending} className="btn-primary">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          {(state.fieldErrors?.name || state.error) && (
            <p role="alert" className="w-full text-sm text-brand-700">{state.fieldErrors?.name ?? state.error}</p>
          )}
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1 font-semibold break-words text-ink">{category.name}</span>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setEditing(true)} className="btn-secondary px-4">Edit</button>
            <form
              action={deleteCategory.bind(null, category.id)}
              onSubmit={(e) => {
                if (!confirm(`Delete category "${category.name}"? Existing requests keep their label.`)) e.preventDefault();
              }}
            >
              <button className="btn-danger px-4">Delete</button>
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
        <p className="rounded-2xl border border-dashed border-line bg-panel p-6 text-center text-muted shadow-sm shadow-sm">
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
