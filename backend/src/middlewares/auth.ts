import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../shared/db.js";
import { AppError, forbidden, unauthorized } from "../shared/errors.js";
import { verifyToken } from "../shared/token.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; mfa: boolean };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    // A "half signed in" token is waiting for an authenticator code. It opens nothing.
    if (payload.stage) throw new Error("not a session token");
    req.user = { id: payload.sub, role: payload.role, mfa: payload.mfa === true };
  } catch {
    throw unauthorized("Your session has expired. Sign in again.");
  }
  next();
}

// Use after requireAuth.
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) throw forbidden("Your account cannot do this");
    // Where it is required, an admin page opens only in a session she
    // signed into with her authenticator code.
    if (req.user!.role === "admin" && env.ADMIN_2FA_REQUIRED && !req.user!.mfa) {
      throw new AppError(403, "TWO_FACTOR_REQUIRED", "Set up two-step sign-in, then sign in with your code");
    }
    next();
  };
}

// Use after requireAuth. Guards everything that shows one member to
// another (TEAM_DECISIONS D7). The status is read from the database on
// every request, so a suspension takes effect at once, not when the
// token expires.
export async function requireApproved(req: Request, _res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { approval_status: true },
  });
  if (user?.approval_status !== "approved") {
    throw new AppError(403, "APPROVAL_REQUIRED", "Your account must be approved before you can do this");
  }
  next();
}
