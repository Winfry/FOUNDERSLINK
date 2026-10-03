import type { NextFunction, Request, Response } from "express";
import { prisma } from "../shared/db.js";
import { AppError, forbidden, unauthorized } from "../shared/errors.js";
import { verifyToken } from "../shared/token.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    throw unauthorized("Your session has expired. Sign in again.");
  }
  next();
}

// Use after requireAuth.
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) throw forbidden("Your account cannot do this");
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
