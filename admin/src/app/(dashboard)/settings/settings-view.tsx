"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminSettingsState } from "@/types";
import { changePasswordAction, enableTwoFactorAction } from "@/app/actions/admin-actions";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsView({ settings }: { settings: AdminSettingsState }) {
  const router = useRouter();
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function enable2fa() {
    startTransition(async () => {
      const res = await enableTwoFactorAction(twoFactorCode);
      if (res.ok) {
        setToast("Two-step sign-in is on.");
        setTwoFactorCode("");
      } else {
        setToast(res.error ?? "Could not enable two-step sign-in.");
      }
    });
  }

  function changePassword() {
    startTransition(async () => {
      const res = await changePasswordAction(currentPassword, newPassword, confirmPassword);
      if (res.ok) {
        setToast("Password updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setToast(res.error ?? "Could not change password.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {toast ? <ToastBanner message={toast} onDismiss={() => setToast(null)} variant={toast.includes("not") ? "error" : "success"} /> : null}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted">Security for your admin account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set up two-step sign-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted">
            Scan this placeholder QR in your authenticator app, or enter the secret manually.
          </p>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-[#1D4ED8] bg-[#EFF6FF] text-[#1E3A8A]">
            QR code placeholder
          </div>
          <p>
            <span className="font-medium">Secret:</span>{" "}
            <code className="rounded bg-slate-100 px-2 py-0.5">{settings.twoFactorSecret}</code>
          </p>
          <Input
            label="Enter 6-digit code to turn on"
            inputMode="numeric"
            maxLength={6}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
          />
          <Button type="button" loading={pending} disabled={twoFactorCode.length !== 6} onClick={enable2fa}>
            Turn on two-step sign-in
          </Button>
          {settings.twoFactorEnabled ? (
            <p className="text-xs text-[#1D4ED8]">Two-step sign-in is currently enabled for sign-in.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="button" loading={pending} onClick={changePassword}>
            Update password
          </Button>
        </CardContent>
      </Card>

      <Button type="button" variant="secondary" className="w-full" onClick={logout}>
        Log out
      </Button>
    </div>
  );
}
