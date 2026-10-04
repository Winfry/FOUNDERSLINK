"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { AdminSettingsState } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Changing the password and turning two-step sign-in on are not connected
// to the backend, so this page shows the current state and does not offer
// forms that would not save.
export function SettingsView({ settings }: { settings: AdminSettingsState }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="The security of your admin account." />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Two-step sign-in</CardTitle>
            <Badge variant={settings.twoFactorEnabled ? "success" : "muted"}>{settings.twoFactorEnabled ? "On" : "Off"}</Badge>
          </div>
          <CardDescription>
            {settings.twoFactorEnabled
              ? "You are asked for a 6-digit code from your authenticator app each time you sign in."
              : "You sign in with your email and password only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-btn bg-surface px-4 py-3 text-sm font-medium text-muted">
            {settings.twoFactorEnabled
              ? "Two-step sign-in is turned on and off from the command line, not from this page."
              : "Two-step sign-in is off for this demo account. It is turned on from the command line, not from this page. For a real launch every admin account has it on."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approving investors</CardTitle>
          <CardDescription>How many admins must approve an investor before she is verified.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-btn bg-surface px-4 py-3 text-sm font-medium text-muted">
            In this demo, one admin&apos;s approval is enough for an investor. The rule for a real launch is two: a second admin must approve before she is
            verified.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>The password you use to sign in to this dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-btn bg-surface px-4 py-3 text-sm font-medium text-muted">
            Changing your password from the dashboard is not available yet.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This session</CardTitle>
          <CardDescription>Log out when you finish, especially on a shared computer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
