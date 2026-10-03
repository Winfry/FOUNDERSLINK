import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  MOCK_2FA_CODE,
  MOCK_ADMIN_ACCOUNTS,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/config";
import type { AdminSession } from "@/lib/auth/types";

export async function POST(request: Request) {
  const jar = await cookies();
  const pendingRaw = jar.get(PENDING_2FA_COOKIE)?.value;
  if (!pendingRaw) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  let pending: { userId: string; email: string };
  try {
    pending = JSON.parse(pendingRaw) as { userId: string; email: string };
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  if (body.code !== MOCK_2FA_CODE) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  const account = MOCK_ADMIN_ACCOUNTS.find((a) => a.id === pending.userId);
  if (!account) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const session: AdminSession = {
    userId: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    mfaVerified: true,
  };

  const res = NextResponse.json({ ok: true, role: account.role });
  res.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.delete(PENDING_2FA_COOKIE);
  return res;
}
