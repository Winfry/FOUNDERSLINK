import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/auth/config";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div>
      <PageHeader title="Admin profile" />
      <Card className="max-w-lg">
        <CardContent className="flex gap-4 pt-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            {session.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{session.name}</p>
            <p className="text-sm text-muted">{session.email}</p>
            <p className="mt-2 text-sm text-foreground">{ROLE_LABELS[session.role]}</p>
            <p className="mt-4 text-xs text-muted">
              Single platform administrator account. Contact support@founderlink.co.ke to update credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
