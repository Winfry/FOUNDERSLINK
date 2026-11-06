import type { AdminSettingsState } from "@/types";
import { getAdminSettings, setTwoFactorEnabled } from "./admin-mock-store";
import { live } from "@/lib/api";
import * as http from "./settings.http";
import { delay } from "./pagination";

export async function fetchAdminSettings(): Promise<AdminSettingsState> {
  if (live) return http.fetchAdminSettings();
  await delay(60);
  return getAdminSettings();
}

// Starts two-step setup: the secret to add to an authenticator app.
export async function startTwoFactorSetup(): Promise<{ secret: string; otpauthUrl: string }> {
  if (live) return http.startTwoFactorSetup();
  await delay();
  const secret = getAdminSettings().twoFactorSecret;
  return { secret, otpauthUrl: `otpauth://totp/FoundersLink:admin?secret=${secret}&issuer=FoundersLink` };
}

export async function enableTwoFactor(code: string): Promise<{ ok: boolean; error?: string }> {
  if (live) return http.enableTwoFactor(code);
  await delay();
  if (code !== "123456") return { ok: false, error: "That code is not right." };
  setTwoFactorEnabled(true);
  return { ok: true };
}

export async function changePassword(
  current: string,
  next: string,
  confirm: string,
): Promise<{ ok: boolean; error?: string }> {
  // The backend has no endpoint for a signed-in admin to change her password.
  if (live) return { ok: false, error: "Password was not changed: the backend cannot do this yet." };
  await delay();
  if (next !== confirm) return { ok: false, error: "New passwords do not match." };
  if (next.length < 8) return { ok: false, error: "Use at least 8 characters." };
  if (current !== "admin123") return { ok: false, error: "Current password is incorrect." };
  return { ok: true };
}
