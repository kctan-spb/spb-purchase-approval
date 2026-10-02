import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={{ name: user.name, email: user.email, role: user.role, canApprove: user.canApprove }} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
