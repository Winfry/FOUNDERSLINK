// In-app messaging (TEAM_DECISIONS D2): direct chats between two
// connected members, one room per deal for its parties, and one group
// chat per circle for its members.
//
// Who may read or write a conversation is decided here, from the
// database, on every call. The client is never trusted to say.
// Messages are stored on our servers and are not end-to-end encrypted.

import { z } from "zod";
import { checkMessage } from "../../ai/client.js";
import type { Message } from "../../generated/prisma/client.js";
import { disconnect, pushTo } from "../../realtime.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { areConnected } from "../network/connections.js";

export const openSchema = z.object({ user_id: z.uuid() });
export const sendSchema = z.object({ body: z.string().trim().min(1).max(4000) });
export const reportSchema = z.object({ reason: z.string().trim().min(5, "Say what is wrong with the message").max(500) });
export const pageSchema = z.object({
  before: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Reports from this many different members suspend the sender until an
// admin has looked (TEAM_DECISIONS D7).
const REPORTS_TO_SUSPEND = 3;

const WARNING = "This message may be asking for money. Never pay anyone to receive funding, and report it if it looks wrong.";

const sender = { select: { id: true, full_name: true } } as const;
type WithSender = Message & { sender: { id: string; full_name: string } | null };

// The warning is for the people receiving a message, not its author.
function view(message: WithSender, viewerId: string) {
  const warn = message.flagged && message.sender_id !== viewerId;
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    kind: message.kind,
    sender: message.sender,
    body: message.body,
    warning: warn ? { text: WARNING, reasons: message.flag_reasons } : null,
    created_at: message.created_at,
  };
}

async function membership(userId: string, conversationId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    include: { conversation: { include: { members: { select: { user_id: true } } } } },
  });
  // To someone who is not in it, a conversation does not exist.
  if (!member) throw notFound("No such conversation");
  return member;
}

function deliver(message: WithSender, memberIds: string[]) {
  for (const id of memberIds) pushTo(id, { type: "message", message: view(message, id) });
}

// --- Direct chats ---

const directKey = (a: string, b: string) => [a, b].sort().join(":");

// Opens the chat between two connected members, or returns the one they have.
export async function openDirect(userId: string, otherId: string) {
  if (otherId === userId) throw new AppError(400, "INVALID_TARGET", "You cannot message yourself");
  if (!(await areConnected(userId, otherId))) {
    throw conflict("NOT_CONNECTED", "You can only message someone who has accepted your connection");
  }

  const key = directKey(userId, otherId);
  const existing = await prisma.conversation.findUnique({ where: { direct_key: key } });
  if (existing) return { id: existing.id, type: "direct", created: false };

  const created = await prisma.conversation.create({
    data: { type: "direct", direct_key: key, members: { create: [{ user_id: userId }, { user_id: otherId }] } },
  });
  return { id: created.id, type: "direct", created: true };
}

// --- Deal rooms ---

// Makes sure a deal has its room and that the room's members are the
// deal's parties. Safe to call any number of times.
async function ensureDealRoom(dealId: string) {
  const room = await prisma.conversation.upsert({
    where: { deal_id: dealId },
    create: { type: "deal", deal_id: dealId },
    update: {},
  });
  const parties = await prisma.dealParty.findMany({ where: { deal_id: dealId }, select: { user_id: true } });
  await prisma.conversationMember.createMany({
    data: parties.map((p) => ({ conversation_id: room.id, user_id: p.user_id })),
    skipDuplicates: true,
  });
  return { room, memberIds: parties.map((p) => p.user_id) };
}

// A circle's group chat. Its members are exactly the circle's members:
// someone who joins is added, and someone who leaves is removed.
export async function syncCircleRoom(circleId: string) {
  const room = await prisma.conversation.upsert({
    where: { circle_id: circleId },
    create: { type: "circle", circle_id: circleId },
    update: {},
  });
  const members = await prisma.circleMember.findMany({ where: { circle_id: circleId }, select: { user_id: true } });
  const memberIds = members.map((m) => m.user_id);
  await prisma.conversationMember.createMany({
    data: memberIds.map((user_id) => ({ conversation_id: room.id, user_id })),
    skipDuplicates: true,
  });
  await prisma.conversationMember.deleteMany({ where: { conversation_id: room.id, user_id: { notIn: memberIds } } });
  return room;
}

// Posts a deal's new timeline events to its room as system messages,
// e.g. "Amina moved the deal to Terms agreed". `textOf` turns an event
// into its sentence, or returns null for events not worth announcing.
export async function announceDealEvents(
  dealId: string,
  textOf: (event: { event: string; actor: string; to_stage: string | null; note: string | null }) => string | null,
) {
  const { room, memberIds } = await ensureDealRoom(dealId);
  const events = await prisma.dealEvent.findMany({
    where: { deal_id: dealId, announced: false },
    include: { actor: { select: { full_name: true } } },
    orderBy: { created_at: "asc" },
  });

  for (const e of events) {
    const body = textOf({ event: e.event, actor: e.actor.full_name, to_stage: e.to_stage, note: e.note });
    if (body) {
      const message = await prisma.message.create({ data: { conversation_id: room.id, kind: "system", body } });
      deliver({ ...message, sender: null }, memberIds);
    }
  }
  await prisma.dealEvent.updateMany({ where: { id: { in: events.map((e) => e.id) } }, data: { announced: true } });
}

// --- Reading and writing ---

export async function listConversations(userId: string) {
  // A deal opened before rooms existed gets its room the first time a party looks.
  const roomless = await prisma.deal.findMany({
    where: { parties: { some: { user_id: userId } }, conversation: null },
    select: { id: true },
  });
  for (const deal of roomless) await ensureDealRoom(deal.id);

  const memberships = await prisma.conversationMember.findMany({
    where: { user_id: userId },
    include: {
      conversation: {
        include: {
          deal: { select: { id: true, title: true } },
          circle: { select: { id: true, name: true } },
          members: { include: { user: { select: { id: true, full_name: true, role: true } } } },
          messages: { orderBy: { id: "desc" }, take: 1, include: { sender } },
        },
      },
    },
  });

  const rows = await Promise.all(
    memberships.map(async (m) => {
      const c = m.conversation;
      const others = c.members.filter((x) => x.user_id !== userId).map((x) => x.user);
      const unread = await prisma.message.count({
        where: {
          conversation_id: c.id,
          // Her own messages are never unread to her.
          OR: [{ sender_id: null }, { sender_id: { not: userId } }],
          ...(m.last_read_at ? { created_at: { gt: m.last_read_at } } : {}),
        },
      });
      const last = c.messages[0];
      return {
        id: c.id,
        type: c.type,
        title: c.deal?.title ?? c.circle?.name ?? others[0]?.full_name ?? "Conversation",
        deal_id: c.deal_id,
        circle_id: c.circle_id,
        members: others,
        unread_count: unread,
        last_message: last ? view(last, userId) : null,
        last_activity: last?.created_at ?? c.created_at,
      };
    }),
  );

  return rows.sort((a, b) => b.last_activity.getTime() - a.last_activity.getTime());
}

// Newest first, a page at a time. Message ids are UUIDv7, which sort by
// creation time, so "before this id" means "older than this message".
export async function listMessages(userId: string, conversationId: string, page: z.infer<typeof pageSchema>) {
  await membership(userId, conversationId);
  const messages = await prisma.message.findMany({
    where: { conversation_id: conversationId, ...(page.before ? { id: { lt: page.before } } : {}) },
    orderBy: { id: "desc" },
    take: page.limit,
    include: { sender },
  });
  return {
    messages: messages.map((m) => view(m, userId)),
    // Pass this as `before` to get the next, older page. Null when there is none.
    next_before: messages.length === page.limit ? messages.at(-1)!.id : null,
  };
}

export async function sendMessage(userId: string, conversationId: string, body: string) {
  const { conversation } = await membership(userId, conversationId);
  const memberIds = conversation.members.map((m) => m.user_id);

  if (conversation.type === "direct") {
    const otherId = memberIds.find((id) => id !== userId)!;
    const blocked = await prisma.block.findFirst({
      where: { OR: [{ blocker_id: otherId, blocked_id: userId }, { blocker_id: userId, blocked_id: otherId }] },
    });
    // The same answer whoever did the blocking, so it does not reveal which.
    if (blocked) throw new AppError(403, "BLOCKED", "You cannot message this member");
  }

  const check = await checkMessage(body);
  const message = await prisma.message.create({
    data: { conversation_id: conversationId, sender_id: userId, body, flagged: check.flagged, flag_reasons: check.reasons },
    include: { sender },
  });

  deliver(message, memberIds);
  return view(message, userId);
}

export async function markRead(userId: string, conversationId: string) {
  await membership(userId, conversationId);
  await prisma.conversationMember.update({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    data: { last_read_at: new Date() },
  });
  return { conversation_id: conversationId, unread_count: 0 };
}

// --- Safety ---

export async function reportMessage(userId: string, messageId: string, reason: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  // Only someone who can see a message can report it.
  if (!message) throw notFound("No such message");
  await membership(userId, message.conversation_id);
  if (!message.sender_id) throw new AppError(400, "SYSTEM_MESSAGE", "System messages cannot be reported");
  if (message.sender_id === userId) throw new AppError(400, "OWN_MESSAGE", "You cannot report your own message");

  const already = await prisma.messageReport.findUnique({
    where: { message_id_reporter_id: { message_id: messageId, reporter_id: userId } },
  });
  if (already) throw conflict("ALREADY_REPORTED", "You have already reported this message");
  await prisma.messageReport.create({ data: { message_id: messageId, reporter_id: userId, reason } });

  // Counted by different reporters, so one person cannot suspend another alone.
  const reporters = await prisma.messageReport.findMany({
    where: { message: { sender_id: message.sender_id } },
    distinct: ["reporter_id"],
    select: { reporter_id: true },
  });
  let suspended = false;
  if (reporters.length >= REPORTS_TO_SUSPEND) {
    const { count } = await prisma.user.updateMany({
      where: { id: message.sender_id, approval_status: "approved" },
      data: { approval_status: "suspended" },
    });
    suspended = count > 0;
    if (suspended) disconnect(message.sender_id);
  }

  return { message_id: messageId, reported: true, sender_suspended: suspended };
}

// For admins: reported messages, with who reported them and why.
export async function listReports() {
  const reports = await prisma.messageReport.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      reporter: { select: { id: true, full_name: true } },
      message: { include: { sender: { select: { id: true, full_name: true, role: true, approval_status: true } } } },
    },
  });
  return reports.map((r) => ({
    id: r.id,
    reason: r.reason,
    reporter: r.reporter,
    message: { id: r.message.id, body: r.message.body, flagged: r.message.flagged, sent_at: r.message.created_at },
    sender: r.message.sender,
    created_at: r.created_at,
  }));
}

export async function setBlocked(userId: string, otherId: string, block: boolean) {
  if (otherId === userId) throw new AppError(400, "INVALID_TARGET", "You cannot block yourself");
  const key = { blocker_id: userId, blocked_id: otherId };

  if (block) {
    const exists = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!exists) throw notFound("No such member");
    await prisma.block.upsert({ where: { blocker_id_blocked_id: key }, create: key, update: {} });
  } else {
    await prisma.block.deleteMany({ where: key });
  }
  return { user_id: otherId, blocked: block };
}
