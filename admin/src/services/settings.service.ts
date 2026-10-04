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

export async function enableTwoFactor(code: string): Promise<{ ok: boolean; error?: string }> {
  // Not connected: it needs the setup step first, and a new session after.
  if (live) return { ok: false, error: "Two-step sign-in is not connected to the backend yet. Nothing was changed." };
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
