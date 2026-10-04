import type { AdminSettingsState } from "@/types";
import { getAdminSettings, setTwoFactorEnabled } from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchAdminSettings(): Promise<AdminSettingsState> {
  await delay(60);
  return getAdminSettings();
}

export async function enableTwoFactor(code: string): Promise<{ ok: boolean; error?: string }> {
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
  await delay();
  if (next !== confirm) return { ok: false, error: "New passwords do not match." };
  if (next.length < 8) return { ok: false, error: "Use at least 8 characters." };
  if (current !== "admin123") return { ok: false, error: "Current password is incorrect." };
  return { ok: true };
}
