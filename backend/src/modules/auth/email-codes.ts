// Six-digit codes sent by email: one to prove an address is hers, one
// to let her set a new password. Only a hash of each code is stored.

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { demoCodesOn, env } from "../../config/env.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict } from "../../shared/errors.js";
import { sendEmail } from "../../shared/email.js";

const CODE_MINUTES = 15;
const MAX_ATTEMPTS = 5;

type Purpose = "verify_email" | "reset_password";

export const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "The code is six digits") });
export const forgotSchema = z.object({ email: z.email().toLowerCase() });
export const resetSchema = z.object({
  email: z.email().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, "The code is six digits"),
  new_password: z.string().min(8, "Use at least 8 characters"),
});

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

const TEXT: Record<Purpose, [string, (code: string) => string]> = {
  verify_email: ["Your FoundersLink code", (c) => `Your FoundersLink code is ${c}. It expires in ${CODE_MINUTES} minutes.`],
  reset_password: [
    "Reset your FoundersLink password",
    (c) => `Your code to set a new FoundersLink password is ${c}. It expires in ${CODE_MINUTES} minutes. If you did not ask for this, ignore this email.`,
  ],
};

async function issue(user: { id: string; email: string }, purpose: Purpose) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = { code_hash: hash(code), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000), attempts: 0 };
  await prisma.emailCode.upsert({
    where: { user_id_purpose: { user_id: user.id, purpose } },
    create: { ...row, user_id: user.id, purpose },
    update: row,
  });

  const [subject, body] = TEXT[purpose];
  const email = await sendEmail(user.email, subject, body(code));
  return {
    email: email.status,
    expires_in_minutes: CODE_MINUTES,
    // When the email could not be sent, the code cannot reach her. So
    // that the demo can still be shown, it is returned here when
    // SHOW_DEMO_CODES is on; never in production.
    ...(email.status !== "sent" && demoCodesOn() ? { dev_code: code } : {}),
  };
}

type Outcome = "ok" | "expired" | "too_many" | "wrong";

// Checks a code and uses it up, and says what was wrong if it fails.
async function redeem(userId: string, purpose: Purpose, code: string): Promise<Outcome> {
  const key = { user_id_purpose: { user_id: userId, purpose } };
  const pending = await prisma.emailCode.findUnique({ where: key });
  if (!pending || pending.expires_at < new Date()) return "expired";
  if (pending.attempts >= MAX_ATTEMPTS) return "too_many";

  if (!timingSafeEqual(Buffer.from(hash(code)), Buffer.from(pending.code_hash))) {
    await prisma.emailCode.update({ where: key, data: { attempts: { increment: 1 } } });
    return "wrong";
  }
  await prisma.emailCode.delete({ where: key });
  return "ok";
}

// The answers every code check in the backend gives, so an app handles
// one situation in one way: 400 for a wrong or expired code, 429 for too
// many tries.
export function codeError(outcome: Exclude<Outcome, "ok">): AppError {
  if (outcome === "expired") return new AppError(400, "CODE_EXPIRED", "That code has expired. Ask for a new one.");
  if (outcome === "too_many") return new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong codes. Ask for a new one.");
  return new AppError(400, "WRONG_CODE", "That code is not right");
}

export function sendVerificationCode(user: { id: string; email: string }) {
  return issue(user, "verify_email");
}

export async function resendVerificationCode(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, email_verified_at: true } });
  if (user.email_verified_at) throw conflict("ALREADY_VERIFIED", "This email address is already verified");
  return issue(user, "verify_email");
}

export async function verifyEmail(userId: string, code: string) {
  // She is signed in, so she can be told exactly what went wrong.
  const outcome = await redeem(userId, "verify_email", code);
  if (outcome !== "ok") throw codeError(outcome);
  await prisma.user.update({ where: { id: userId }, data: { email_verified_at: new Date() } });
  return { email_verified: true };
}

// The answer is the same whether or not the address has an account, so
// it cannot be used to find out who is registered.
//
// Anyone can ask, without signing in, so a code shown on screen here would
// let a stranger take over the account (FINAL_VERIFICATION 24). It is
// shown only for the demo: SHOW_DEMO_CODES on, never in production, and
// only while no email service is set up, so a code that can be emailed
// goes only to the inbox. Even then a staff account never gets a real one.
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
  const sent = user ? await issue(user, "reset_password") : null;
  const message = "If that address has an account, a code has been sent to it.";
  if (!demoCodesOn() || env.RESEND_API_KEY) return { message };
  // An address with no account, or an admin's, gets a made-up code that
  // never works, so the answers look the same and do not say which
  // addresses are staff.
  const real = user && user.role !== "admin" ? sent?.dev_code : undefined;
  return { message, dev_code: real ?? String(randomInt(0, 1_000_000)).padStart(6, "0") };
}

export async function resetPassword(input: z.infer<typeof resetSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  // One message for an unknown address and a wrong code, for the same reason.
  if (!user || (await redeem(user.id, "reset_password", input.code)) !== "ok") {
    throw new AppError(400, "WRONG_CODE", "That code is wrong or has expired. Ask for a new one.");
  }
  await prisma.user.update({
    where: { id: user.id },
    // Receiving the code proves the address is hers, so it is verified too.
    data: { password_hash: await bcrypt.hash(input.new_password, 10), email_verified_at: new Date() },
  });
  return { password_reset: true };
}
