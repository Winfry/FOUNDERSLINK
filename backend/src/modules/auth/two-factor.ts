// A second sign-in step for admins, using an authenticator app.
//
// An admin with it switched on signs in with her password and gets a
// short-lived "half signed in" token. That token opens nothing. She
// exchanges it, with the six-digit code from her app, for a real session.

import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, unauthorized } from "../../shared/errors.js";
import { sessionExpiry, signPendingToken, signToken, verifyToken } from "../../shared/token.js";
import { generateSecret, otpauthUrl, verifyCode } from "../../shared/totp.js";

const code = z.string().regex(/^\d{6}$/, "The code is six digits");
export const enableSchema = z.object({ code });
export const verifySchema = z.object({ pending_token: z.string().min(10), code });

const MAX_ATTEMPTS = 5;
// Wrong codes per admin since her last success. In memory: enough to
// stop guessing within the few minutes a pending token lasts.
const attempts = new Map<string, number>();

// Step one of setting up: a new secret for her to add to her app. It
// does nothing until she proves the app works, in enable().
export async function setup(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, totp_enabled: true } });
  if (user.totp_enabled) throw conflict("ALREADY_ENABLED", "Two-step sign-in is already on for this account");

  const secret = generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { totp_secret: secret } });
  return { secret, otpauth_url: otpauthUrl(user.email, secret) };
}

export async function enable(userId: string, given: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, totp_secret: true, totp_enabled: true } });
  if (user.totp_enabled) throw conflict("ALREADY_ENABLED", "Two-step sign-in is already on for this account");
  if (!user.totp_secret) throw conflict("SETUP_FIRST", "Start the setup first");
  if (!verifyCode(user.totp_secret, given)) throw new AppError(400, "WRONG_CODE", "That code is not right");

  await prisma.user.update({ where: { id: userId }, data: { totp_enabled: true } });
  // She has just proved she holds the app, so this session counts as two-step.
  return { two_factor_enabled: true, token: signToken({ sub: userId, role: user.role, mfa: true }), expires_at: sessionExpiry() };
}

// Step two of signing in.
export async function verify(input: z.infer<typeof verifySchema>) {
  let userId: string;
  try {
    const payload = verifyToken(input.pending_token);
    if (payload.stage !== "2fa") throw new Error("not a pending token");
    userId = payload.sub;
  } catch {
    throw unauthorized("Sign in again");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totp_enabled || !user.totp_secret) throw unauthorized("Sign in again");
  if ((attempts.get(userId) ?? 0) >= MAX_ATTEMPTS) {
    throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong codes. Sign in again in a few minutes.");
  }

  if (!verifyCode(user.totp_secret, input.code)) {
    attempts.set(userId, (attempts.get(userId) ?? 0) + 1);
    // The count clears itself, so a locked-out admin is not locked out for good.
    setTimeout(() => attempts.delete(userId), 5 * 60_000).unref();
    throw new AppError(400, "WRONG_CODE", "That code is not right");
  }
  attempts.delete(userId);

  return {
    token: signToken({ sub: user.id, role: user.role, mfa: true }),
    expires_at: sessionExpiry(),
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, approval_status: user.approval_status },
  };
}
