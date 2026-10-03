import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
  roleCanAccessPath,
} from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

const PUBLIC_PATHS = ["/login", "/verify-2fa", "/403"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);
  const pending2fa = request.cookies.get(PENDING_2FA_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (pathname === "/") {
    if (session?.mfaVerified) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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

  if (pathname === "/login") {
    if (session?.mfaVerified) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/admin-users" || pathname === "/audit-log" || pathname === "/settings") {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session?.mfaVerified) {
    if (pending2fa) {
      return NextResponse.redirect(new URL("/login?step=verify", request.url));
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (!roleCanAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
