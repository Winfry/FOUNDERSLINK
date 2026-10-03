import bcrypt from "bcrypt";
import { z } from "zod";
import { SIGNUP_ROLES } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";
import { conflict, unauthorized } from "../../shared/errors.js";
import { sessionExpiry, signPendingToken, signToken } from "../../shared/token.js";
import { completedFor } from "../compliance/status.js";
import { sendVerificationCode } from "./email-codes.js";

// A person picks founder, investor or expert at sign-up. `admin` is not
// in the list, so nobody can make themselves one: admins are created
// with `npm run admin:create`.
export const registerSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters"),
  full_name: z.string().trim().min(2),
  role: z.enum(SIGNUP_ROLES).default("founder"),
});

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

const publicUser = { id: true, email: true, full_name: true, role: true, approval_status: true } as const;

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("EMAIL_TAKEN", "An account with this email already exists");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      password_hash: await bcrypt.hash(input.password, 10),
    },
    select: publicUser,
  });

  // A code goes to her address straight away, to prove it is hers.
  const email_verification = await sendVerificationCode(user);

  return { token: signToken({ sub: user.id, role: user.role }), expires_at: sessionExpiry(), user, email_verification };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message for a wrong email and a wrong password, so the response
  // does not reveal which emails have accounts.
  const ok = user && (await bcrypt.compare(input.password, user.password_hash));
  if (!ok) throw unauthorized("Wrong email or password");

  // An admin with two-step sign-in gets no session yet: only a token to
  // exchange, with her authenticator code, at POST /auth/2fa/verify.
  if (user.role === "admin" && user.totp_enabled) {
    return { two_factor_required: true as const, pending_token: signPendingToken(user.id, user.role) };
  }

  return {
    token: signToken({ sub: user.id, role: user.role }),
    expires_at: sessionExpiry(),
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      approval_status: user.approval_status,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUser,
      totp_enabled: true,
      email_verified_at: true,
      phone: true,
      phone_verified_at: true,
      preferred_language: true,
      notification_channel: true,
      message_permission: true,
      share_contact: true,
      founder_profile: true,
      investor_profile: true,
      expert_profile: true,
      funder: true,
    },
  });
  if (!user) throw unauthorized();
  if (!user.founder_profile) return user;
  return { ...user, founder_profile: { ...user.founder_profile, already_have: await completedFor(userId) } };
}
