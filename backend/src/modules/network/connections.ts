// Connections: two approved members agreeing to be in touch. Nothing
// else between two people (a deal, later a direct chat) is possible
// without an accepted one.

import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";

export const requestSchema = z.object({
  user_id: z.uuid(),
  message: z.string().trim().max(500).optional(),
});

export const respondSchema = z.object({ status: z.enum(["accepted", "declined"]) });

const person = { select: { id: true, full_name: true, role: true } } as const;

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

  const target = await prisma.user.findUnique({ where: { id: input.user_id }, select: { approval_status: true, role: true } });
  // An unapproved member does not exist as far as others can tell.
  if (!target || target.approval_status !== "approved" || target.role === "admin") throw notFound("No such member");

  const existing = await connectionBetween(userId, input.user_id);
  if (existing) throw conflict("ALREADY_REQUESTED", `A connection between you already exists and is ${existing.status}`);

  return prisma.connection.create({
    data: { requester_id: userId, addressee_id: input.user_id, message: input.message ?? null },
    include: { addressee: person },
  });
}

export async function listConnections(userId: string) {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ requester_id: userId }, { addressee_id: userId }] },
    include: { requester: person, addressee: person },
    orderBy: { created_at: "desc" },
  });
  return rows.map((c) => ({
    id: c.id,
    status: c.status,
    message: c.message,
    direction: c.requester_id === userId ? "sent" : "received",
    with: c.requester_id === userId ? c.addressee : c.requester,
    created_at: c.created_at,
    responded_at: c.responded_at,
  }));
}

export async function respond(userId: string, connectionId: string, status: string) {
  // Only the person who was asked can answer, and only once.
  const { count } = await prisma.connection.updateMany({
    where: { id: connectionId, addressee_id: userId, status: "pending" },
    data: { status, responded_at: new Date() },
  });
  if (count === 0) throw notFound("No pending connection request with this id");
  return { id: connectionId, status };
}
