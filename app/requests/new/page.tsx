import { listCategories } from "@/features/categories/data";
import { RequestForm } from "@/features/requests/components/RequestForm";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">New Request</h1>
      <RequestForm categories={categories} />
    </div>
  );
}
