import { NextResponse } from "next/server";
import { getAdminSettings } from "@/services/admin-mock-store";
import { MOCK_ADMIN_ACCOUNT, PENDING_2FA_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";
import { ApiError, backend, live } from "@/lib/api";

interface LoginAnswer {
  token?: string;
  two_factor_required?: boolean;
  pending_token?: string;
  user?: { id: string; email: string; full_name: string; role: string };
}

const cookie = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, path: "/", maxAge });

// Signs in against the backend. An admin with two-step sign-in on gets
// no session yet, only a short-lived token to exchange with her code.
async function backendLogin(email: string | undefined, password: string | undefined) {
  let answer: LoginAnswer;
  try {
    answer = await backend<LoginAnswer>("POST", "/auth/login", { email, password }, "");
  } catch (err) {
    const message = err instanceof ApiError && err.status < 500 ? "Invalid email or password" : "Cannot reach the FounderLink backend";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (answer.two_factor_required && answer.pending_token) {
    const res = NextResponse.json({ ok: true, twoFactorRequired: true });
    res.cookies.set(PENDING_2FA_COOKIE, JSON.stringify({ pendingToken: answer.pending_token, email }), cookie(60 * 5));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (!answer.token || answer.user?.role !== "admin") {
    return NextResponse.json({ error: "This account is not an admin" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, twoFactorRequired: false });
  const session = { userId: answer.user.id, email: answer.user.email, name: answer.user.full_name, mfaVerified: true, token: answer.token };
  res.cookies.set(SESSION_COOKIE, JSON.stringify(session), cookie(60 * 60 * 8));
  return res;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (live) return backendLogin(email, password);

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
