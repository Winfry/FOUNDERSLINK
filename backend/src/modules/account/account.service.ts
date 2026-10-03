// A person's rights over her own data (Data Protection Act 2019,
// KENYA_AMENDMENTS 9): see everything we hold about her, and delete it.

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { disconnect } from "../../realtime.js";
import { prisma } from "../../shared/db.js";
import { env } from "../../config/env.js";
import { AppError, conflict, unauthorized } from "../../shared/errors.js";
import { sendSms } from "../../shared/sms.js";
import { listConsents } from "./consents.js";

export const deleteSchema = z.object({ password: z.string().min(1) });

// Everything we hold about her, in one file she can keep. Other
// people's details are left out: where she shares a record with someone
// (a deal, a circle, a chat) the export has her own part of it.
export async function exportData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      approval_status: true,
      created_at: true,
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
      vetting_application: { include: { checks: true } },
      portfolio: true,
      ventures: true,
    },
  });

  const [consents, statuses, deadlines, questions, connections, deals, circles, payments, notes, votes, messages, reports, blocks] =
    await Promise.all([
      listConsents(userId),
      prisma.complianceStatus.findMany({ where: { entity_type: "business", entity_id: userId } }),
      prisma.complianceDeadline.findMany({ where: { entity_type: "business", entity_id: userId } }),
      prisma.complianceQuestion.findMany({ where: { user_id: userId } }),
      prisma.connection.findMany({
        where: { OR: [{ requester_id: userId }, { addressee_id: userId }] },
        select: { id: true, status: true, message: true, requester_id: true, addressee_id: true, created_at: true },
      }),
      prisma.dealParty.findMany({
        where: { user_id: userId },
        select: { role: true, joined_at: true, shares_track_record: true, deal: { select: { id: true, type: true, title: true, stage: true, status: true } } },
      }),
      prisma.circleMember.findMany({
        where: { user_id: userId },
        select: { role: true, joined_at: true, circle: { select: { id: true, name: true, type: true } } },
      }),
      prisma.paymentRecord.findMany({ where: { member_id: userId } }),
      prisma.circleNote.findMany({ where: { author_id: userId } }),
      prisma.circleVote.findMany({ where: { user_id: userId } }),
      prisma.message.findMany({
        where: { sender_id: userId },
        select: { id: true, conversation_id: true, body: true, created_at: true },
      }),
      prisma.messageReport.findMany({ where: { reporter_id: userId } }),
      prisma.block.findMany({ where: { blocker_id: userId } }),
    ]);

  return {
    exported_at: new Date(),
    account: user,
    consents,
    compliance: { statuses, deadlines, questions },
    connections,
    deals,
    circles: { memberships: circles, contributions: payments, notes, votes },
    messages_sent: messages,
    reports_made: reports,
    blocks,
    note: "This is everything FounderLink holds about you. Other people's details are not included.",
  };
}

// Deletes the account and everything that belongs only to her. She
// confirms with her password, because it cannot be undone.
//
// Two things are refused, since other people depend on them: a circle
// she organises that still has other members, and a deal that is still
// in progress. She settles those first.
export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(password, user.password_hash))) throw unauthorized("Wrong password");
  if (user.role === "admin") throw conflict("ADMIN_ACCOUNT", "An admin account is removed by another admin, not here");

  const [circles, deals] = await Promise.all([
    prisma.circle.findMany({
      where: { members: { some: { user_id: userId, role: "organiser" } } },
      select: { id: true, name: true, _count: { select: { members: true } } },
    }),
    prisma.deal.findMany({
      where: { parties: { some: { user_id: userId } }, status: { in: ["open", "paused"] }, stage: { notIn: ["closed", "active"] } },
      select: { id: true, title: true },
    }),
  ]);
  const shared = circles.filter((c) => c._count.members > 1);
  if (shared.length > 0) {
    throw conflict("ORGANISES_CIRCLES", `Hand over or empty the circles you organise first: ${shared.map((c) => c.name).join(", ")}`);
  }
  if (deals.length > 0) {
    throw conflict("DEALS_IN_PROGRESS", `Close or decline your deals in progress first: ${deals.map((d) => d.title).join(", ")}`);
  }

  await prisma.$transaction([
    // Circles where she was the only member go with her.
    prisma.circle.deleteMany({ where: { id: { in: circles.map((c) => c.id) } } }),
    // Rows tied to her as the "business" they describe, not as their author.
    prisma.complianceStatus.deleteMany({ where: { entity_type: "business", entity_id: userId } }),
    prisma.complianceDeadline.deleteMany({ where: { entity_type: "business", entity_id: userId } }),
    // Everything else that is hers is removed with the account.
    prisma.user.delete({ where: { id: userId } }),
  ]);
  disconnect(userId);

  return { deleted: true };
}

// --- Settings and phone number ---

// Accepts 07..., 01..., 2547... or +2547..., and stores one form.
const kenyanMobile = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[17]\d{8}$/, "Use a Kenyan mobile number")
  .transform((p) => `+254${p.slice(-9)}`);

export const settingsSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  phone: kenyanMobile.nullable().optional(),
  preferred_language: z.enum(["en", "sw"]).optional(),
  notification_channel: z.enum(["in_app", "sms"]).optional(),
  message_permission: z.enum(["anyone", "verified", "none"]).optional(),
  share_contact: z.boolean().optional(),
});

export const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "The code is six digits") });

const settingsFields = {
  full_name: true,
  phone: true,
  phone_verified_at: true,
  preferred_language: true,
  notification_channel: true,
  message_permission: true,
  share_contact: true,
} as const;

export async function updateSettings(userId: string, input: z.infer<typeof settingsSchema>) {
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: settingsFields });

  const phoneChanged = input.phone !== undefined && input.phone !== current.phone;
  if (phoneChanged && input.phone) {
    const taken = await prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } });
    if (taken) throw conflict("PHONE_TAKEN", "This phone number is already on another account");
  }

  const verified = phoneChanged ? false : current.phone_verified_at !== null;
  if ((input.notification_channel ?? current.notification_channel) === "sms" && !verified) {
    throw conflict("PHONE_NOT_VERIFIED", "Verify your phone number before choosing SMS notifications");
  }

  return prisma.user.update({
    where: { id: userId },
    // A new number is not hers until she proves it.
    data: { ...input, ...(phoneChanged ? { phone_verified_at: null } : {}) },
    select: settingsFields,
  });
}

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

// Sends a six-digit code to her phone. Only its hash is stored.
export async function sendPhoneCode(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true, phone_verified_at: true } });
  if (!user.phone) throw conflict("NO_PHONE", "Add a phone number first");
  if (user.phone_verified_at) throw conflict("ALREADY_VERIFIED", "This phone number is already verified");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = { phone: user.phone, code_hash: hashCode(code), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000), attempts: 0 };
  await prisma.phoneCode.upsert({ where: { user_id: userId }, create: { ...row, user_id: userId }, update: row });

  const sms = await sendSms(user.phone, `Your FounderLink code is ${code}. It expires in ${CODE_MINUTES} minutes.`);
  return {
    sms: sms.status,
    expires_in_minutes: CODE_MINUTES,
    // With no SMS provider set up, the code cannot reach her phone. So
    // that the flow can still be shown, it is returned here, but never
    // in production.
    ...(sms.status !== "sent" && env.NODE_ENV !== "production" ? { dev_code: code } : {}),
  };
}

export async function verifyPhoneCode(userId: string, code: string) {
  const pending = await prisma.phoneCode.findUnique({ where: { user_id: userId } });
  if (!pending || pending.expires_at < new Date()) throw conflict("CODE_EXPIRED", "Ask for a new code");
  if (pending.attempts >= MAX_ATTEMPTS) throw conflict("TOO_MANY_ATTEMPTS", "Too many wrong codes. Ask for a new one.");

  const right = timingSafeEqual(Buffer.from(hashCode(code)), Buffer.from(pending.code_hash));
  if (!right) {
    await prisma.phoneCode.update({ where: { user_id: userId }, data: { attempts: { increment: 1 } } });
    throw new AppError(400, "WRONG_CODE", "That code is not right");
  }

  const [user] = await prisma.$transaction([
    // Only the number the code was sent to becomes verified.
    prisma.user.update({ where: { id: userId, phone: pending.phone }, data: { phone_verified_at: new Date() }, select: settingsFields }),
    prisma.phoneCode.delete({ where: { user_id: userId } }),
  ]);
  return user;
}
