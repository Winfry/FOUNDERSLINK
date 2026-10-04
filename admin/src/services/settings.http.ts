import { cookies } from "next/headers";
import type { AdminSettingsState } from "@/types";
import { backend } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

interface ApiAdmin {
  id: string;
  email: string;
  totp_enabled: boolean;
}

// Whether two-step sign-in is on is read from the backend. The secret
// is not shown: the backend makes a new one each time setup is started
// (POST /auth/2fa/setup), which this page does not do yet.
export async function fetchAdminSettings(): Promise<AdminSettingsState> {
  const session = parseSession(cookies().get(SESSION_COOKIE)?.value);
  const admins = await backend<ApiAdmin[]>("GET", "/admin/admins");
  const me = admins.find((a) => a.id === session?.userId);
  return { twoFactorEnabled: me?.totp_enabled ?? false, twoFactorSecret: "" };
}
