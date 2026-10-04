import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  MOCK_2FA_CODE,
  MOCK_ADMIN_ACCOUNT,
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

  if (pending.userId !== MOCK_ADMIN_ACCOUNT.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const session: AdminSession = {
    userId: MOCK_ADMIN_ACCOUNT.id,
    email: MOCK_ADMIN_ACCOUNT.email,
    name: MOCK_ADMIN_ACCOUNT.name,
    mfaVerified: true,
  };

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.delete(PENDING_2FA_COOKIE);
  return res;
}
