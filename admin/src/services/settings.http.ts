import { cookies } from "next/headers";
import type { AdminSettingsState } from "@/types";
import { ApiError, backend } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

interface ApiAdmin {
  id: string;
  email: string;
  totp_enabled: boolean;
}

// Whether two-step sign-in is on is read from the backend. The secret is
// shown only while she sets it up: the backend makes a new one each time
// setup is started.
export async function fetchAdminSettings(): Promise<AdminSettingsState> {
  const session = parseSession(cookies().get(SESSION_COOKIE)?.value);
  const admins = await backend<ApiAdmin[]>("GET", "/admin/admins");
  const me = admins.find((a) => a.id === session?.userId);
  return { twoFactorEnabled: me?.totp_enabled ?? false, twoFactorSecret: "" };
}

// Starts setup: a new secret for her authenticator app. Nothing changes
// until she confirms it with a code.
export async function startTwoFactorSetup(): Promise<{ secret: string; otpauthUrl: string }> {
  const answer = await backend<{ secret: string; otpauth_url: string }>("POST", "/auth/2fa/setup");
  return { secret: answer.secret, otpauthUrl: answer.otpauth_url };
}

// Confirms setup with a code from the app. The backend then signs her in
// again with a session that passed two-step sign-in; the dashboard keeps it.
export async function enableTwoFactor(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const answer = await backend<{ token: string }>("POST", "/auth/2fa/enable", { code });
    const session = parseSession(cookies().get(SESSION_COOKIE)?.value);
    if (session) {
      cookies().set(SESSION_COOKIE, JSON.stringify({ ...session, token: answer.token, mfaVerified: true }), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: `Not turned on: ${err.message}.` };
    throw err;
  }
}
