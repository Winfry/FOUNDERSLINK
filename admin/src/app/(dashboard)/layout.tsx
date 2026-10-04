import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getServerSession } from "@/lib/auth/session";
import { fetchNavCounts } from "@/services/stats.service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const navCounts = await fetchNavCounts();

  return (
    <DashboardShell session={session} navCounts={navCounts}>
      {children}
    </DashboardShell>
  );
}
