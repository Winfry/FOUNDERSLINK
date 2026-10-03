import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { conflict, unauthorized } from "../../shared/errors.js";
import { signToken } from "../../shared/token.js";

// No role field: everyone who signs up is a founder for now. The role is
// never taken from the client.
export const registerSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters"),
  full_name: z.string().trim().min(2),
});

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

const publicUser = { id: true, email: true, full_name: true, role: true } as const;

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("EMAIL_TAKEN", "An account with this email already exists");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      full_name: input.full_name,
      password_hash: await bcrypt.hash(input.password, 10),
    },
    select: publicUser,
  });

  return { token: signToken({ sub: user.id, role: user.role }), user };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message for a wrong email and a wrong password, so the response
  // does not reveal which emails have accounts.
  const ok = user && (await bcrypt.compare(input.password, user.password_hash));
  if (!ok) throw unauthorized("Wrong email or password");

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...publicUser, founder_profile: true },
  });
  if (!user) throw unauthorized();
  return user;
}
