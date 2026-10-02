import { listCategories } from "@/features/categories/data";
import { CategoryManager } from "@/features/categories/components/CategoryManager";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, user] = await Promise.all([listCategories(), getCurrentUser()]);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-5 text-xl font-semibold sm:mb-6 sm:text-2xl">Categories</h1>
      {user?.isAdmin ? (
        <CategoryManager categories={categories} />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">Only admins can add, rename or delete categories.</p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium break-words">
                {c.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
