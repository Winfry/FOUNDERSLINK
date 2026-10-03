import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../shared/errors.js";
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
