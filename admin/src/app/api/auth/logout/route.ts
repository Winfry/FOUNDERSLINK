import { NextResponse } from "next/server";
import { PENDING_2FA_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(PENDING_2FA_COOKIE);
  return res;
}
