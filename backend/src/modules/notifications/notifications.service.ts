// Notifications. Every one is stored and pushed live to the member if
// she is online. It also goes by SMS when she chose SMS, her number is
// verified and she has agreed to be contacted.
//
// Telling someone must never break the thing that happened, so notify()
// swallows its own errors.

import { pushTo } from "../../realtime.js";
import { prisma } from "../../shared/db.js";
import { notFound } from "../../shared/errors.js";
import { sendSms } from "../../shared/sms.js";
import { hasConsent } from "../account/consents.js";

export interface Notice {
  type: string;
  title: string;
  body: string;
  link?: string;
}

export async function notify(userId: string, notice: Notice) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notification_channel: true, phone: true, phone_verified_at: true },
    });
    if (!user) return;

    let delivery_status = "in_app";
    if (user.notification_channel === "sms" && user.phone && user.phone_verified_at && (await hasConsent(userId, "contact"))) {
      const sms = await sendSms(user.phone, `FounderLink: ${notice.title}. ${notice.body}`);
      delivery_status = `sms_${sms.status}`;
    }

    const saved = await prisma.notification.create({
      data: { user_id: userId, type: notice.type, title: notice.title, body: notice.body, link: notice.link ?? null, delivery_status },
    });
    pushTo(userId, { type: "notification", notification: saved });
  } catch (err) {
    console.warn(`Could not notify ${userId}: ${err instanceof Error ? err.message : err}`);
  }
}

export async function notifyMany(userIds: string[], notice: Notice) {
  await Promise.all(userIds.map((id) => notify(id, notice)));
}

export async function listNotifications(userId: string, unreadOnly: boolean) {
  const [notifications, unread_count] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId, ...(unreadOnly ? { read_at: null } : {}) },
      orderBy: { id: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { user_id: userId, read_at: null } }),
  ]);
  return { unread_count, notifications };
}

export async function markRead(userId: string, notificationId: string) {
  // Scoped to her, so nobody marks another member's notification.
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { read_at: new Date() },
  });
  if (count === 0) throw notFound("No such notification");
  return { id: notificationId, read: true };
}

export async function markAllRead(userId: string) {
  const { count } = await prisma.notification.updateMany({ where: { user_id: userId, read_at: null }, data: { read_at: new Date() } });
  return { marked: count };
}

const REMIND_DAYS = 3;

// Reminds founders of compliance deadlines coming up in the next three
// days. Each deadline is reminded once. Safe to run as often as you like.
export async function sendDeadlineReminders(now = new Date()) {
  const soon = new Date(now.getTime() + REMIND_DAYS * 24 * 60 * 60 * 1000);
  const due = await prisma.complianceDeadline.findMany({
    where: { entity_type: "business", reminder_sent_at: null, due_date: { gte: now, lte: soon } },
    include: { item: { select: { title: true } } },
  });

  for (const deadline of due) {
    await notify(deadline.entity_id, {
      type: "deadline_reminder",
      title: "A deadline is coming up",
      body: `${deadline.item.title} is due on ${deadline.due_date.toISOString().slice(0, 10)}.`,
      link: `/compliance/${deadline.item_id}`,
    });
    await prisma.complianceDeadline.update({ where: { id: deadline.id }, data: { reminder_sent_at: now } });
  }
  return { reminded: due.length };
}
