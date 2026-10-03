import { NextResponse } from "next/server";
import { MOCK_ADMIN_ACCOUNTS, PENDING_2FA_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  const account = MOCK_ADMIN_ACCOUNTS.find((a) => a.email === email && a.password === password);
  if (!account) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const pending = JSON.stringify({ userId: account.id, email: account.email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PENDING_2FA_COOKIE, pending, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
