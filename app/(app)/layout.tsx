import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { countDecidablePending } from "@/features/approvals/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Badge on "Approvals": pending requests this approver may decide. Nothing is shown to staff.
  const pendingCount = user.canApprove ? await countDecidablePending(user) : 0;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        user={{ name: user.name, email: user.email, role: user.role, canApprove: user.canApprove, isAdmin: user.isAdmin }}
        pendingCount={pendingCount}
      />
      <main className="min-w-0 flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-10">
        {children}
      </main>
    </div>
  );
}
