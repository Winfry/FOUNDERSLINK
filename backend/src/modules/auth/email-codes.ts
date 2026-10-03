// Six-digit codes sent by email: one to prove an address is hers, one
// to let her set a new password. Only a hash of each code is stored.

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { env } from "../../config/env.js";
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
  verify_email: ["Your FounderLink code", (c) => `Your FounderLink code is ${c}. It expires in ${CODE_MINUTES} minutes.`],
  reset_password: [
    "Reset your FounderLink password",
    (c) => `Your code to set a new FounderLink password is ${c}. It expires in ${CODE_MINUTES} minutes. If you did not ask for this, ignore this email.`,
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
    // that the flow can still be shown, it is returned here, but never
    // in production.
    ...(email.status !== "sent" && env.NODE_ENV !== "production" ? { dev_code: code } : {}),
  };
}

// Checks a code and uses it up. Returns false for a wrong or expired one.
async function redeem(userId: string, purpose: Purpose, code: string): Promise<boolean> {
  const key = { user_id_purpose: { user_id: userId, purpose } };
  const pending = await prisma.emailCode.findUnique({ where: key });
  if (!pending || pending.expires_at < new Date() || pending.attempts >= MAX_ATTEMPTS) return false;

  if (!timingSafeEqual(Buffer.from(hash(code)), Buffer.from(pending.code_hash))) {
    await prisma.emailCode.update({ where: key, data: { attempts: { increment: 1 } } });
    return false;
  }
  await prisma.emailCode.delete({ where: key });
  return true;
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
  if (!(await redeem(userId, "verify_email", code))) {
    throw new AppError(400, "WRONG_CODE", "That code is wrong or has expired. Ask for a new one.");
  }
  await prisma.user.update({ where: { id: userId }, data: { email_verified_at: new Date() } });
  return { email_verified: true };
}

// The answer is the same whether or not the address has an account, so
// it cannot be used to find out who is registered.
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  const sent = user ? await issue(user, "reset_password") : null;
  return {
    message: "If that address has an account, a code has been sent to it.",
    ...(sent && "dev_code" in sent ? { dev_code: sent.dev_code } : {}),
  };
}

export async function resetPassword(input: z.infer<typeof resetSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  // One message for an unknown address and a wrong code, for the same reason.
  if (!user || !(await redeem(user.id, "reset_password", input.code))) {
    throw new AppError(400, "WRONG_CODE", "That code is wrong or has expired. Ask for a new one.");
  }
  await prisma.user.update({
    where: { id: user.id },
    // Receiving the code proves the address is hers, so it is verified too.
    data: { password_hash: await bcrypt.hash(input.new_password, 10), email_verified_at: new Date() },
  });
  return { password_reset: true };
}
