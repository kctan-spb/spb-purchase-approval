import { listCategories } from "@/features/categories/data";
import { CategoryManager } from "@/features/categories/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">Categories</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
