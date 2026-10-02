import { listCategories } from "@/features/categories/data";
import { RequestForm } from "@/features/requests/components/RequestForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const [categories, settings] = await Promise.all([listCategories(), getSettings()]);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title mb-1">New request</h1>
      <p className="mb-5 text-sm text-muted sm:mb-6">
        Fill in the details below. An approver will review it and you can follow its status under Requests.
      </p>
      <RequestForm categories={categories} attachmentRequiredOverMyr={settings.attachmentRequiredOverMyr} />
    </div>
  );
}
