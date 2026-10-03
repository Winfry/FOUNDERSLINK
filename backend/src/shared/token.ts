import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
  sub: string;
  role: string;
  // True when the session was signed into with an authenticator code.
  mfa?: boolean;
  // Set on the short-lived token an admin holds between her password
  // and her code. A token with a stage is not a session.
  stage?: "2fa";
}

const SESSION_DAYS = 7;

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: "HS256", expiresIn: `${SESSION_DAYS}d` });
}

// When a token signed now stops working, in milliseconds since 1970,
// so an app knows when to send the user back to sign in.
export const sessionExpiry = () => Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;

export function verifyToken(token: string): TokenPayload {
  // Pin the algorithm so a token signed with another one is rejected.
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
}

// Proves the password was right, and nothing more. It lasts five minutes.
export function signPendingToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role, stage: "2fa" }, env.JWT_SECRET, { algorithm: "HS256", expiresIn: "5m" });
}
