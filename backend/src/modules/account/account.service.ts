// A person's rights over her own data (Data Protection Act 2019,
// KENYA_AMENDMENTS 9): see everything we hold about her, and delete it.

import bcrypt from "bcrypt";
import { z } from "zod";
import { disconnect } from "../../realtime.js";
import { prisma } from "../../shared/db.js";
import { conflict, unauthorized } from "../../shared/errors.js";
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
