// Connections: two approved members agreeing to be in touch. Nothing
// else between two people (a deal, later a direct chat) is possible
// without an accepted one.

import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { notify } from "../notifications/notifications.service.js";

export const requestSchema = z.object({
  user_id: z.uuid(),
  message: z.string().trim().max(500).optional(),
});

export const respondSchema = z.object({ status: z.enum(["accepted", "declined"]) });

const person = {
  select: { id: true, full_name: true, role: true, email: true, phone: true, phone_verified_at: true, share_contact: true },
} as const;

type Person = { id: string; full_name: string; role: string; email: string; phone: string | null; phone_verified_at: Date | null; share_contact: boolean };

// Contact details are private until both people have accepted the
// connection, and she can keep them private even then. A phone number
// is shown only once it is verified as hers.
export function contactOf(p: Person, accepted: boolean) {
  if (!accepted || !p.share_contact) return null;
  const phone = p.phone_verified_at ? p.phone : null;
  return { email: p.email, phone, whatsapp_link: phone ? `https://wa.me/${phone.slice(1)}` : null };
}

const publicPerson = (p: Person) => ({ id: p.id, full_name: p.full_name, role: p.role });

// A connection has no direction once it exists, so look both ways.
const between = (a: string, b: string) => ({
  OR: [
    { requester_id: a, addressee_id: b },
    { requester_id: b, addressee_id: a },
  ],
});

export async function connectionBetween(a: string, b: string) {
  return prisma.connection.findFirst({ where: between(a, b) });
}

export async function areConnected(a: string, b: string) {
  return (await connectionBetween(a, b))?.status === "accepted";
}

export async function requestConnection(userId: string, input: z.infer<typeof requestSchema>) {
  if (input.user_id === userId) throw new AppError(400, "INVALID_TARGET", "You cannot connect with yourself");

  const target = await prisma.user.findUnique({
    where: { id: input.user_id },
    select: { approval_status: true, role: true, message_permission: true },
  });
  // An unapproved member does not exist as far as others can tell.
  if (!target || target.approval_status !== "approved" || target.role === "admin") throw notFound("No such member");

  // Each member chooses who may ask to connect with her.
  if (target.message_permission === "none") {
    throw new AppError(403, "NOT_ACCEPTING_REQUESTS", "This member is not accepting connection requests");
  }
  if (target.message_permission === "verified") {
    const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone_verified_at: true } });
    if (!me.phone_verified_at) {
      throw new AppError(403, "PHONE_VERIFICATION_REQUIRED", "This member only accepts requests from members with a verified phone number");
    }
  }

  const existing = await connectionBetween(userId, input.user_id);
  if (existing) throw conflict("ALREADY_REQUESTED", `A connection between you already exists and is ${existing.status}`);

  const created = await prisma.connection.create({
    data: { requester_id: userId, addressee_id: input.user_id, message: input.message ?? null },
    include: { addressee: person },
  });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { full_name: true } });
  await notify(input.user_id, {
    type: "connection_request",
    title: "New connection request",
    body: `${me.full_name} would like to connect with you.`,
    link: "/connections",
  });

  return { id: created.id, status: created.status, message: created.message, with: publicPerson(created.addressee) };
}

export async function listConnections(userId: string) {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ requester_id: userId }, { addressee_id: userId }] },
    include: { requester: person, addressee: person },
    orderBy: { created_at: "desc" },
  });
  return rows.map((c) => {
    const other = c.requester_id === userId ? c.addressee : c.requester;
    return {
    id: c.id,
    status: c.status,
    message: c.message,
    direction: c.requester_id === userId ? "sent" : "received",
    with: publicPerson(other),
    contact: contactOf(other, c.status === "accepted"),
    created_at: c.created_at,
    responded_at: c.responded_at,
    };
  });
}

export async function respond(userId: string, connectionId: string, status: string) {
  // Only the person who was asked can answer, and only once.
  const { count } = await prisma.connection.updateMany({
    where: { id: connectionId, addressee_id: userId, status: "pending" },
    data: { status, responded_at: new Date() },
  });
  if (count === 0) throw notFound("No pending connection request with this id");

  if (status === "accepted") {
    const connection = await prisma.connection.findUniqueOrThrow({ where: { id: connectionId }, include: { addressee: { select: { full_name: true } } } });
    await notify(connection.requester_id, {
      type: "connection_accepted",
      title: "Connection accepted",
      body: `${connection.addressee.full_name} accepted your connection request.`,
      link: "/connections",
    });
  }
  return { id: connectionId, status };
}
