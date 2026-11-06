"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { enableTwoFactorAction, startTwoFactorSetupAction } from "@/app/actions/admin-actions";
import type { AdminSettingsState } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Two-step sign-in can be turned on here (TEAM_DECISIONS D7;
// FINAL_VERIFICATION section 4, item 10). Changing the password is not
// connected to the backend, so that card only says so.
export function SettingsView({ settings }: { settings: AdminSettingsState }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    setMessage(null);
    startTransition(async () => {
      try {
        setSetup(await startTwoFactorSetupAction());
      } catch {
        setMessage({ text: "Setup did not start: the FoundersLink server did not answer. Try again.", error: true });
      }
    });
  }

  function confirm() {
    startTransition(async () => {
      try {
        const result = await enableTwoFactorAction(code.trim());
        if (!result.ok) {
          setMessage({ text: result.error ?? "That code is not right.", error: true });
          return;
        }
        setSetup(null);
        setCode("");
        setMessage({ text: "Two-step sign-in is on. You will be asked for a code each time you sign in." });
        router.refresh();
      } catch {
        setMessage({ text: "Nothing was changed: the FoundersLink server did not answer. Try again.", error: true });
      }
    });
  }

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
        <CardContent className="space-y-4">
          {message ? (
            <p className={`rounded-btn px-4 py-3 text-sm font-semibold ${message.error ? "bg-destructive-light text-destructive" : "bg-success-light text-green-700"}`}>
              {message.text}
            </p>
          ) : null}
          {settings.twoFactorEnabled ? null : setup ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                1. In your authenticator app (Google Authenticator, Microsoft Authenticator or similar), add an account
                with this key, or open the link on your phone.
              </p>
              <p className="break-all rounded-btn bg-surface px-4 py-3 font-mono text-base font-bold tracking-wider text-foreground">
                {setup.secret.replace(/(.{4})/g, "$1 ").trim()}
              </p>
              <a href={setup.otpauthUrl} className="text-sm font-bold text-primary underline">
                Open in my authenticator app
              </a>
              <p className="text-sm font-medium text-foreground">2. Type the 6-digit code it shows.</p>
              <div className="flex flex-wrap items-end gap-3">
                <input
                  aria-label="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="field !w-40 text-center font-mono text-lg tracking-widest"
                />
                <Button type="button" variant="primary" disabled={code.length !== 6 || pending} onClick={confirm}>
                  Turn on
                </Button>
                <Button type="button" variant="secondary" disabled={pending} onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="primary" disabled={pending} onClick={begin}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Turn on two-step sign-in
            </Button>
          )}
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
