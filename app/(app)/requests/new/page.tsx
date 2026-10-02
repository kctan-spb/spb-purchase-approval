import { listCategories } from "@/features/categories/data";
import { RequestForm } from "@/features/requests/components/RequestForm";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-xl">
      <p className="eyebrow">Requests</p>
      <h1 className="page-title mb-5 sm:mb-6">New request</h1>
      <RequestForm categories={categories} />
    </div>
  );
}
