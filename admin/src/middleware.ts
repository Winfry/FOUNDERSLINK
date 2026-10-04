import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PENDING_2FA_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);
  const pending2fa = request.cookies.get(PENDING_2FA_COOKIE)?.value;

  if (pathname === "/") {
    if (session?.mfaVerified) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    if (pending2fa) {
      return NextResponse.redirect(new URL("/login?step=verify", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/verify-2fa") {
    const q = request.nextUrl.searchParams.toString();
    return NextResponse.redirect(new URL(`/login?step=verify${q ? `&${q}` : ""}`, request.url));
  }

  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  if (pathname === "/login") {
    if (session?.mfaVerified) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    return NextResponse.next();
  }

  if (!session?.mfaVerified) {
    if (pending2fa && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login?step=verify", request.url));
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
