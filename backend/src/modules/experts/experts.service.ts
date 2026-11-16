// Experts (KENYA_AMENDMENTS 10): mentors, lawyers and accountants who
// have been vetted. A member finds one, asks for a short office-hours
// session, and the expert decides how many she takes on each month.

import { z } from "zod";
import { COUNTIES, PROFESSIONS, SECTORS } from "../../shared/constants.js";
import { explain, NOT_ADVICE, PRACTICE, PRACTICE_AREAS, rankExperts, readQuestion, type RateItem } from "../../../../shared/expert-question/index.js";
import { allowedAreas, professionById, trustSummary } from "../../../../shared/professions/index.js";
import { journeyOf, matchNeeds, planIntro, whoYouMayNeed, type Side } from "../../../../shared/deal-experts/index.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { consented } from "../account/consents.js";
import { notify } from "../notifications/notifications.service.js";

export const filterSchema = z.object({
  profession: z.enum(PROFESSIONS).optional(),
  sector: z.enum(SECTORS).optional(),
  county: z.enum(COUNTIES).optional(),
  practice_area: z.enum(PRACTICE_AREAS).optional(),
});

export const findSchema = z.object({
  question: z.string().trim().min(5, "Say a little about what you need help with").max(600),
  lang: z.enum(["en", "sw"]).default("en"),
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
      // Not shown once her licence has run out, until she is checked again.
      OR: [{ licence_expires_at: null }, { licence_expires_at: { gt: new Date() } }],
      ...(filter.profession ? { profession: filter.profession } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          // The passed checks that earn her trust level: the register, the
          // qualification or the references (shared/professions trustSummary).
          vetting_application: {
            select: {
              checks: {
                where: { result: "pass", check_type: { in: ["professional_register", "qualification", "reference"] } },
                select: { check_type: true, checked_at: true },
              },
            },
          },
          office_hours_given: { where: { status: "done" }, select: { requester_id: true } },
        },
      },
    },
  });

  const ids = experts.map((e) => e.user_id);
  const [visible, taken] = await Promise.all([consented(ids, "profile_visibility"), takenThisMonth(ids)]);
  const covers = (list: string[], value?: string) => !value || list.length === 0 || list.includes(value);

  return experts
    .filter(
      (e) =>
        visible.has(e.user_id) &&
        covers(e.sectors, filter.sector) &&
        covers(e.counties, filter.county) &&
        (!filter.practice_area || e.practice_areas.includes(filter.practice_area)),
    )
    .map((e) => {
      const left = Math.max(0, e.office_hours_per_month - (taken.get(e.user_id) ?? 0));
      return {
        user_id: e.user_id,
        full_name: e.user.full_name,
        profession: e.profession,
        organisation_name: e.organisation_name,
        register_body: e.register_body,
        register_checked: (e.user.vetting_application?.checks ?? []).some((c) => c.check_type === "professional_register"),
        // How she was checked, in words members see: "Licensed · LSK · checked 12 Nov 2026".
        verification: trustSummary(e.profession, e.user.vetting_application?.checks ?? []),
        bio: e.bio,
        sectors: e.sectors,
        counties: e.counties,
        services: e.services,
        practice_areas: e.practice_areas,
        // What she charges (shared/expert-question RateItem). Payment is between the member and her.
        rate_card: (Array.isArray(e.rate_card) ? e.rate_card : []) as unknown as RateItem[],
        trust: professionById(e.profession)?.trust ?? "experience",
        licence_expires_at: e.licence_expires_at,
        office_hours: { per_month: e.office_hours_per_month, left_this_month: left },
        // Different people she has finished a session with.
        helped: new Set(e.user.office_hours_given.map((o) => o.requester_id)).size,
      };
    })
    // Those who can take a session now come first, then the most experienced.
    .sort((a, b) => Number(b.office_hours.left_this_month > 0) - Number(a.office_hours.left_this_month > 0) || b.helped - a.helped)
    .slice(0, limit);
}

/**
 * A member asks in her own words ("I want to invest in a farm, who knows
 * land law?"). The question is read for a profession, practice area,
 * sector and county; the best-fitting verified experts come back with the
 * reasons each fits, and a short plain explanation of why that kind of
 * expert matters. General information, never advice; nothing is booked.
 */
export async function findExperts(input: z.infer<typeof findSchema>, role = "founder") {
  const understood = readQuestion(input.question, COUNTIES, (p, a) => allowedAreas(p).includes(a));
  const all = await listExperts({}, 200);

  // "I'm preparing to raise investment, who will I need?": not one expert
  // but the whole path, each step with the best verified expert for it.
  const journey = journeyOf(input.question);
  if (journey) {
    const side: Side = role === "investor" ? "investor" : "founder";
    const plan = matchNeeds(whoYouMayNeed(journey, { side, sector: understood.sector }), all, understood.sector);
    const experts = [...new Map(plan.flatMap((p) => (p.expert ? [[p.expert.user_id, p.expert] as const] : []))).values()];
    return {
      understood: { profession: null, practice_area: null, practice_area_label: null, sector: understood.sector ?? null, county: understood.county ?? null, budget_kes: understood.budgetKes ?? null },
      explanation: planIntro(journey, side),
      experts,
      plan: plan.map((p) => ({ need: p.id, area: p.area, who: p.who, why: p.why, step: p.step, expert: p.expert })),
      note: NOT_ADVICE[input.lang],
    };
  }

  const ranked = rankExperts(all, understood, input.lang, 3);
  return {
    understood: {
      profession: understood.profession ?? null,
      practice_area: understood.practiceArea ?? null,
      practice_area_label: understood.practiceArea ? PRACTICE[understood.practiceArea].label : null,
      sector: understood.sector ?? null,
      county: understood.county ?? null,
      budget_kes: understood.budgetKes ?? null,
    },
    explanation: explain(understood, input.lang),
    experts: ranked.map((r) => ({ ...r.expert, reasons: r.reasons })),
    plan: null,
    note: NOT_ADVICE[input.lang],
  };
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
