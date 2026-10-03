// Experts (KENYA_AMENDMENTS 10): mentors, lawyers and accountants who
// have been vetted. A member finds one, asks for a short office-hours
// session, and the expert decides how many she takes on each month.

import { z } from "zod";
import { COUNTIES, PROFESSIONS, SECTORS } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { consented } from "../account/consents.js";
import { notify } from "../notifications/notifications.service.js";

export const filterSchema = z.object({
  profession: z.enum(PROFESSIONS).optional(),
  sector: z.enum(SECTORS).optional(),
  county: z.enum(COUNTIES).optional(),
});

export const requestSchema = z.object({ topic: z.string().trim().min(10, "Say what you need help with").max(500) });
export const respondSchema = z.object({ status: z.enum(["accepted", "declined", "done"]) });

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

// Sessions an expert has taken on this month, accepted or already done.
async function takenThisMonth(expertIds: string[]) {
  const rows = await prisma.officeHour.groupBy({
    by: ["expert_id"],
    where: { expert_id: { in: expertIds }, status: { in: ["accepted", "done"] }, responded_at: { gte: monthStart() } },
    _count: true,
  });
  return new Map(rows.map((r) => [r.expert_id, r._count]));
}

// Approved experts who have agreed to be seen, best fit first. An empty
// list of sectors or counties on an expert means she covers all of them.
export async function listExperts(filter: z.infer<typeof filterSchema>, limit = 50) {
  const experts = await prisma.expertProfile.findMany({
    where: {
      user: { approval_status: "approved", role: "expert" },
      ...(filter.profession ? { profession: filter.profession } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          // A passed register check is what turns a claim into a badge.
          vetting_application: { select: { checks: { where: { check_type: "professional_register", result: "pass" } } } },
          office_hours_given: { where: { status: "done" }, select: { requester_id: true } },
        },
      },
    },
  });

  const ids = experts.map((e) => e.user_id);
  const [visible, taken] = await Promise.all([consented(ids, "profile_visibility"), takenThisMonth(ids)]);
  const covers = (list: string[], value?: string) => !value || list.length === 0 || list.includes(value);

  return experts
    .filter((e) => visible.has(e.user_id) && covers(e.sectors, filter.sector) && covers(e.counties, filter.county))
    .map((e) => {
      const left = Math.max(0, e.office_hours_per_month - (taken.get(e.user_id) ?? 0));
      return {
        user_id: e.user_id,
        full_name: e.user.full_name,
        profession: e.profession,
        organisation_name: e.organisation_name,
        register_body: e.register_body,
        register_checked: (e.user.vetting_application?.checks.length ?? 0) > 0,
        bio: e.bio,
        sectors: e.sectors,
        counties: e.counties,
        services: e.services,
        office_hours: { per_month: e.office_hours_per_month, left_this_month: left },
        // Different people she has finished a session with.
        helped: new Set(e.user.office_hours_given.map((o) => o.requester_id)).size,
      };
    })
    // Those who can take a session now come first, then the most experienced.
    .sort((a, b) => Number(b.office_hours.left_this_month > 0) - Number(a.office_hours.left_this_month > 0) || b.helped - a.helped)
    .slice(0, limit);
}

// A few experts to offer when an answer says "get professional help".
export function suggestExperts(business: { sector: string; county: string } | null) {
  return listExperts(business ? { sector: business.sector as never, county: business.county as never } : {}, 3);
}

export async function requestOfficeHour(userId: string, expertId: string, topic: string) {
  if (expertId === userId) throw new AppError(400, "INVALID_TARGET", "You cannot book yourself");
  const [expert] = (await listExperts({})).filter((e) => e.user_id === expertId);
  if (!expert) throw notFound("No such expert");
  if (expert.office_hours.left_this_month === 0) {
    throw conflict("NO_SLOTS", "This expert has no office hours left this month");
  }

  const open = await prisma.officeHour.findFirst({
    where: { expert_id: expertId, requester_id: userId, status: { in: ["requested", "accepted"] } },
  });
  if (open) throw conflict("ALREADY_REQUESTED", "You already have a session open with this expert");

  const session = await prisma.officeHour.create({ data: { expert_id: expertId, requester_id: userId, topic } });
  await notify(expertId, { type: "office_hour_requested", title: "New office-hours request", body: topic, link: "/office-hours" });
  return session;
}

const person = { select: { id: true, full_name: true } } as const;

export async function listOfficeHours(userId: string) {
  const rows = await prisma.officeHour.findMany({
    where: { OR: [{ expert_id: userId }, { requester_id: userId }] },
    include: { expert: person, requester: person },
    orderBy: { created_at: "desc" },
  });
  return rows.map((o) => ({
    id: o.id,
    topic: o.topic,
    status: o.status,
    role: o.expert_id === userId ? "expert" : "requester",
    with: o.expert_id === userId ? o.requester : o.expert,
    created_at: o.created_at,
    responded_at: o.responded_at,
  }));
}

// Only the expert answers a request, and marks a session done.
export async function respondToOfficeHour(userId: string, id: string, status: string) {
  const session = await prisma.officeHour.findFirst({ where: { id, expert_id: userId } });
  if (!session) throw notFound("No such session");

  const allowed = session.status === "requested" ? ["accepted", "declined"] : session.status === "accepted" ? ["done"] : [];
  if (!allowed.includes(status)) throw conflict("WRONG_STATUS", `A session that is ${session.status} cannot be marked ${status}`);

  if (status === "accepted") {
    const profile = await prisma.expertProfile.findUniqueOrThrow({ where: { user_id: userId } });
    const taken = (await takenThisMonth([userId])).get(userId) ?? 0;
    if (taken >= profile.office_hours_per_month) throw conflict("NO_SLOTS", "You have no office hours left this month");
  }

  const updated = await prisma.officeHour.update({ where: { id }, data: { status, responded_at: new Date() } });

  // Accepting is the expert agreeing to be in touch, so the two are
  // connected and can message each other.
  if (status === "accepted") {
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requester_id: session.requester_id, addressee_id: userId },
          { requester_id: userId, addressee_id: session.requester_id },
        ],
      },
    });
    if (!existing) {
      await prisma.connection.create({
        data: { requester_id: session.requester_id, addressee_id: userId, status: "accepted", responded_at: new Date(), message: session.topic },
      });
    } else if (existing.status !== "accepted") {
      await prisma.connection.update({ where: { id: existing.id }, data: { status: "accepted", responded_at: new Date() } });
    }
  }

  if (status !== "done") {
    await notify(session.requester_id, {
      type: `office_hour_${status}`,
      title: status === "accepted" ? "Your session was accepted" : "Your session request was declined",
      body: session.topic,
      link: "/office-hours",
    });
  }

  return { id: updated.id, status: updated.status };
}
