import { listCategories } from "@/features/categories/data";
import { CategoryManager } from "@/features/categories/components/CategoryManager";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, user] = await Promise.all([listCategories(), getCurrentUser()]);
  return (
    <div className="mx-auto max-w-xl">
      <p className="eyebrow">Governance</p>
      <h1 className="page-title mb-5 sm:mb-6">Categories</h1>
      {user?.isAdmin ? (
        <CategoryManager categories={categories} />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">Only admins can add, rename or delete categories.</p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {categories.map((c) => (
              <li key={c.id} className="card px-4 py-3 font-semibold break-words text-ink">
                {c.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
