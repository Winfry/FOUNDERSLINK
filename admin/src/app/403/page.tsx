import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive-light p-4 text-destructive">
        <ShieldOff className="h-10 w-10" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground">403 — Access denied</h1>
      <p className="text-muted">
        Your role does not have permission to view this section. Contact a Super Admin if you need access.
      </p>
      <Link href="/dashboard">
        <Button variant="secondary">Back to dashboard</Button>
      </Link>
    </main>
  );
}
