import { NextResponse } from "next/server";
import { getAdminSettings } from "@/services/admin-mock-store";
import { MOCK_ADMIN_ACCOUNT, PENDING_2FA_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (email !== MOCK_ADMIN_ACCOUNT.email || password !== MOCK_ADMIN_ACCOUNT.password) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const settings = getAdminSettings();
  const res = NextResponse.json({ ok: true, twoFactorRequired: settings.twoFactorEnabled });

  if (settings.twoFactorEnabled) {
    const pending = JSON.stringify({ userId: MOCK_ADMIN_ACCOUNT.id, email: MOCK_ADMIN_ACCOUNT.email });
    res.cookies.set(PENDING_2FA_COOKIE, pending, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const session = {
    userId: MOCK_ADMIN_ACCOUNT.id,
    email: MOCK_ADMIN_ACCOUNT.email,
    name: MOCK_ADMIN_ACCOUNT.name,
    mfaVerified: true,
  };
  res.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
