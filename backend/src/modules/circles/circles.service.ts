// Founder Circles (KENYA_AMENDMENTS 7).
//
// A money circle is a group of people who already know each other,
// saving towards shared goals. Nobody is ever matched into one: the only
// way in is an invite from its organiser. A learning circle has no money
// and may be found and joined.
//
// FounderLink keeps a circle's records. It never receives, holds or
// forwards money: members pay into the circle's own account, and the
// treasurer records what was paid.

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { COUNTIES, SECTORS } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, forbidden, notFound } from "../../shared/errors.js";

const NOTICE =
  "FounderLink keeps this circle's records. It does not hold or move money: contributions go to the circle's own account and are recorded here by the treasurer.";

const INVITE_DAYS = 7;

const money = z.number().int().positive().max(2_000_000_000);

export const createSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(500).optional(),
    type: z.enum(["money", "learning"]),
    sector: z.enum(SECTORS).optional(),
    county: z.enum(COUNTIES).optional(),
    discoverable: z.boolean().default(false),
    contribution_amount_kes: money.optional(),
    contribution_frequency: z.enum(["weekly", "monthly"]).optional(),
  })
  // A circle that pools money is never open to people its members do not know.
  .refine((c) => !(c.type === "money" && c.discoverable), "A money circle cannot be discoverable")
  .refine((c) => c.type === "money" || c.contribution_amount_kes === undefined, "A learning circle has no contributions");

export const updateSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  contribution_amount_kes: money.nullable().optional(),
  contribution_frequency: z.enum(["weekly", "monthly"]).nullable().optional(),
  registration_status: z.enum(["unregistered", "in_progress", "registered"]).optional(),
  registration_number: z.string().trim().max(60).nullable().optional(),
  // The circle's own Paybill or Till number.
  paybill_number: z.string().trim().regex(/^\d{5,7}$/, "A Paybill or Till number is 5 to 7 digits").nullable().optional(),
});

export const joinSchema = z.object({ token: z.string().min(10) });
export const roleSchema = z.object({ role: z.enum(["treasurer", "member"]) });

export const goalSchema = z.object({
  title: z.string().trim().min(3).max(120),
  target_amount_kes: money.optional(),
  target_date: z.coerce.date().optional(),
});

export const goalPatchSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  target_amount_kes: money.nullable().optional(),
  target_date: z.coerce.date().nullable().optional(),
  status: z.enum(["open", "reached", "dropped"]).optional(),
});

export const contributionSchema = z.object({
  member_id: z.uuid(),
  amount_kes: money,
  paid_at: z.coerce.date(),
  goal_id: z.uuid().optional(),
  mpesa_receipt: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,12}$/, "Not an M-Pesa receipt number").optional(),
  note: z.string().trim().max(200).optional(),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  // Give the date of a meeting to record its minutes.
  held_at: z.coerce.date().optional(),
});

export const decisionSchema = z.object({ question: z.string().trim().min(5).max(300) });
export const voteSchema = z.object({ choice: z.enum(["yes", "no", "abstain"]) });

const person = { select: { id: true, full_name: true } } as const;

// Loads the caller's membership. To a non-member, a circle does not exist.
async function member(userId: string, circleId: string) {
  const row = await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: circleId, user_id: userId } },
    include: { circle: true },
  });
  if (!row) throw notFound("No such circle");
  return row;
}

async function organiser(userId: string, circleId: string) {
  const row = await member(userId, circleId);
  if (row.role !== "organiser") throw forbidden("Only the circle's organiser can do this");
  return row;
}

// The organiser or the treasurer keeps the money records.
async function keeper(userId: string, circleId: string) {
  const row = await member(userId, circleId);
  if (row.role === "member") throw forbidden("Only the organiser or treasurer can record contributions");
  if (row.circle.type !== "money") throw conflict("NOT_A_MONEY_CIRCLE", "A learning circle has no contributions");
  return row;
}

// Whether two people are in a circle together. A deal may be opened
// between members of the same circle, as well as between connections.
export async function shareCircle(a: string, b: string) {
  const shared = await prisma.circle.findFirst({
    where: { AND: [{ members: { some: { user_id: a } } }, { members: { some: { user_id: b } } }] },
    select: { id: true },
  });
  return shared?.id ?? null;
}

export async function createCircle(userId: string, input: z.infer<typeof createSchema>) {
  const circle = await prisma.circle.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      sector: input.sector ?? null,
      county: input.county ?? null,
      discoverable: input.discoverable,
      contribution_amount_kes: input.contribution_amount_kes ?? null,
      contribution_frequency: input.contribution_frequency ?? null,
      created_by: userId,
      members: { create: { user_id: userId, role: "organiser" } },
    },
  });
  return getCircle(userId, circle.id);
}

export async function listCircles(userId: string) {
  const rows = await prisma.circleMember.findMany({
    where: { user_id: userId },
    include: { circle: { include: { _count: { select: { members: true } } } } },
    orderBy: { joined_at: "desc" },
  });
  return rows.map((r) => ({
    id: r.circle.id,
    name: r.circle.name,
    type: r.circle.type,
    my_role: r.role,
    members: r.circle._count.members,
    registration_status: r.circle.registration_status,
  }));
}

// Learning circles a member could join, nearest her sector and county
// first. Money circles are never suggested to anyone.
export async function suggestCircles(userId: string) {
  const [profile, circles] = await Promise.all([
    prisma.founderProfile.findUnique({ where: { user_id: userId }, select: { sector: true, county: true } }),
    prisma.circle.findMany({
      where: { type: "learning", discoverable: true, members: { none: { user_id: userId } } },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  return circles
    .map((c) => {
      const reasons = [
        ...(profile && c.sector === profile.sector ? [`For ${c.sector} businesses, like yours`] : []),
        ...(profile && c.county === profile.county ? [`Based in ${c.county}, like you`] : []),
      ];
      return { id: c.id, name: c.name, description: c.description, sector: c.sector, county: c.county, members: c._count.members, reasons };
    })
    .sort((a, b) => b.reasons.length - a.reasons.length);
}

// The start of the current contribution period: this week's Monday, or
// the first of this month.
function periodStart(frequency: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (frequency === "weekly") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  else start.setUTCDate(1);
  return start;
}

export async function getCircle(userId: string, circleId: string) {
  const mine = await member(userId, circleId);
  const circle = await prisma.circle.findUniqueOrThrow({
    where: { id: circleId },
    include: {
      members: { include: { user: person }, orderBy: { joined_at: "asc" } },
      goals: { orderBy: { created_at: "asc" } },
      // Only payments matched to a member count towards totals and goals.
      payments: { where: { matched_status: "matched" }, select: { member_id: true, goal_id: true, amount_kes: true, paid_at: true } },
    },
  });

  const sum = (rows: { amount_kes: number }[]) => rows.reduce((total, p) => total + p.amount_kes, 0);
  const amount = circle.contribution_amount_kes;
  const frequency = circle.contribution_frequency;
  const start = frequency ? periodStart(frequency) : null;

  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    type: circle.type,
    sector: circle.sector,
    county: circle.county,
    discoverable: circle.discoverable,
    my_role: mine.role,
    registration_status: circle.registration_status,
    registration_number: circle.registration_number,
    paybill_number: circle.paybill_number,
    contribution: amount && frequency ? { amount_kes: amount, frequency } : null,
    total_contributed_kes: sum(circle.payments),
    members: circle.members.map((m) => {
      const paid = circle.payments.filter((p) => p.member_id === m.user_id);
      const thisPeriod = start ? sum(paid.filter((p) => p.paid_at >= start)) : 0;
      return {
        user_id: m.user_id,
        full_name: m.user.full_name,
        role: m.role,
        contributed_kes: sum(paid),
        // For a money circle with a set contribution: has she paid this
        // week's or month's amount yet?
        this_period: amount && start ? { paid_kes: thisPeriod, due_kes: Math.max(0, amount - thisPeriod) } : null,
      };
    }),
    goals: circle.goals.map((g) => {
      const raised = sum(circle.payments.filter((p) => p.goal_id === g.id));
      return {
        id: g.id,
        title: g.title,
        target_amount_kes: g.target_amount_kes,
        target_date: g.target_date,
        status: g.status,
        raised_kes: raised,
        progress_text: g.target_amount_kes ? `KSh ${raised.toLocaleString("en-KE")} of KSh ${g.target_amount_kes.toLocaleString("en-KE")}` : null,
      };
    }),
    notice: circle.type === "money" ? NOTICE : null,
  };
}

export async function updateCircle(userId: string, circleId: string, input: z.infer<typeof updateSchema>) {
  const { circle } = await organiser(userId, circleId);
  if (circle.type !== "money" && (input.contribution_amount_kes || input.contribution_frequency)) {
    throw conflict("NOT_A_MONEY_CIRCLE", "A learning circle has no contributions");
  }
  if (input.paybill_number) {
    if (circle.type !== "money") throw conflict("NOT_A_MONEY_CIRCLE", "A learning circle has no contributions");
    const taken = await prisma.circle.findFirst({ where: { paybill_number: input.paybill_number, id: { not: circleId } } });
    if (taken) throw conflict("PAYBILL_TAKEN", "Another circle already uses this Paybill or Till number");
  }
  await prisma.circle.update({ where: { id: circleId }, data: input });
  return getCircle(userId, circleId);
}

// --- Joining ---

// An invite link. For a money circle each link lets in one person, so a
// forwarded link cannot bring in strangers. A learning circle's link
// works for anyone until it expires.
export async function createInvite(userId: string, circleId: string) {
  const { circle } = await organiser(userId, circleId);
  const invite = await prisma.circleInvite.create({
    data: {
      circle_id: circleId,
      token: randomBytes(24).toString("base64url"),
      created_by: userId,
      expires_at: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      max_uses: circle.type === "money" ? 1 : null,
    },
  });
  return {
    token: invite.token,
    // The frontend turns this into a full link to share, e.g. on WhatsApp.
    path: `/circles/join/${invite.token}`,
    expires_at: invite.expires_at,
    single_use: invite.max_uses === 1,
  };
}

async function usableInvite(token: string) {
  const invite = await prisma.circleInvite.findUnique({
    where: { token },
    include: { circle: { include: { _count: { select: { members: true } } } } },
  });
  const spent = invite && invite.max_uses !== null && invite.uses >= invite.max_uses;
  if (!invite || invite.revoked || spent || invite.expires_at < new Date()) {
    throw notFound("This invite is not valid any more. Ask for a new one.");
  }
  return invite;
}

// What someone holding a link sees before she joins.
export async function previewInvite(token: string) {
  const { circle } = await usableInvite(token);
  return { name: circle.name, description: circle.description, type: circle.type, members: circle._count.members };
}

export async function joinWithInvite(userId: string, token: string) {
  const invite = await usableInvite(token);
  const already = await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: invite.circle_id, user_id: userId } },
  });
  if (already) throw conflict("ALREADY_A_MEMBER", "You are already in this circle");

  await prisma.$transaction([
    prisma.circleMember.create({ data: { circle_id: invite.circle_id, user_id: userId } }),
    prisma.circleInvite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } }),
  ]);
  return getCircle(userId, invite.circle_id);
}

// Joining without an invite: only a learning circle that chose to be found.
export async function joinOpenCircle(userId: string, circleId: string) {
  const circle = await prisma.circle.findUnique({ where: { id: circleId } });
  if (!circle || circle.type !== "learning" || !circle.discoverable) throw notFound("No such circle");

  const already = await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: circleId, user_id: userId } },
  });
  if (already) throw conflict("ALREADY_A_MEMBER", "You are already in this circle");

  await prisma.circleMember.create({ data: { circle_id: circleId, user_id: userId } });
  return getCircle(userId, circleId);
}

// The organiser removes a member, or a member leaves.
export async function removeMember(userId: string, circleId: string, targetId: string) {
  const mine = await member(userId, circleId);
  if (targetId !== userId && mine.role !== "organiser") throw forbidden("Only the organiser can remove someone else");

  const target = targetId === userId ? mine : await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: circleId, user_id: targetId } },
  });
  if (!target) throw notFound("Not a member of this circle");
  if (target.role === "organiser") throw conflict("ORGANISER_CANNOT_LEAVE", "The organiser cannot leave or be removed");

  await prisma.circleMember.delete({ where: { id: target.id } });
  return { circle_id: circleId, removed: targetId };
}

export async function setRole(userId: string, circleId: string, targetId: string, role: string) {
  await organiser(userId, circleId);
  // Never touches the organiser's own row, whatever id is sent.
  const { count } = await prisma.circleMember.updateMany({
    where: { circle_id: circleId, user_id: targetId, role: { not: "organiser" } },
    data: { role },
  });
  if (count === 0) throw notFound("Not a member whose role can be changed");
  return getCircle(userId, circleId);
}

// --- Goals ---

export async function addGoal(userId: string, circleId: string, input: z.infer<typeof goalSchema>) {
  await organiser(userId, circleId);
  return prisma.circleGoal.create({
    data: { circle_id: circleId, title: input.title, target_amount_kes: input.target_amount_kes ?? null, target_date: input.target_date ?? null },
  });
}

export async function updateGoal(userId: string, circleId: string, goalId: string, input: z.infer<typeof goalPatchSchema>) {
  await organiser(userId, circleId);
  const { count } = await prisma.circleGoal.updateMany({ where: { id: goalId, circle_id: circleId }, data: input });
  if (count === 0) throw notFound("No such goal");
  return prisma.circleGoal.findUniqueOrThrow({ where: { id: goalId } });
}

// --- Contributions ---

// The treasurer records a payment a member made to the circle's own
// account. This is the manual fallback: the same table will take
// payments read from an M-Pesa statement or a Paybill confirmation.
export async function recordContribution(userId: string, circleId: string, input: z.infer<typeof contributionSchema>) {
  await keeper(userId, circleId);

  const payer = await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: circleId, user_id: input.member_id } },
  });
  if (!payer) throw new AppError(400, "NOT_A_MEMBER", "That person is not a member of this circle");

  if (input.goal_id) {
    const goal = await prisma.circleGoal.findFirst({ where: { id: input.goal_id, circle_id: circleId } });
    if (!goal) throw new AppError(400, "UNKNOWN_GOAL", "That goal does not belong to this circle");
  }
  if (input.mpesa_receipt) {
    const seen = await prisma.paymentRecord.findUnique({
      where: { circle_id_mpesa_receipt: { circle_id: circleId, mpesa_receipt: input.mpesa_receipt } },
    });
    // One receipt, one payment: it cannot be counted twice.
    if (seen) throw conflict("RECEIPT_ALREADY_RECORDED", "A payment with this M-Pesa receipt is already recorded");
  }
  if (input.paid_at > new Date()) throw new AppError(400, "FUTURE_DATE", "A payment cannot be dated in the future");

  return prisma.paymentRecord.create({
    data: {
      circle_id: circleId,
      member_id: input.member_id,
      goal_id: input.goal_id ?? null,
      amount_kes: input.amount_kes,
      paid_at: input.paid_at,
      mpesa_receipt: input.mpesa_receipt ?? null,
      note: input.note ?? null,
      source: "manual",
      recorded_by: userId,
    },
  });
}

// Every member can see the full history: who paid, when, and who wrote it down.
export async function listContributions(userId: string, circleId: string) {
  await member(userId, circleId);
  const rows = await prisma.paymentRecord.findMany({
    // Unmatched payments are in the reconciliation, for the treasurer.
    where: { circle_id: circleId, matched_status: "matched" },
    include: { member: person, goal: { select: { id: true, title: true } } },
    orderBy: { paid_at: "desc" },
  });
  return rows.map((p) => ({
    id: p.id,
    member: p.member,
    amount_kes: p.amount_kes,
    paid_at: p.paid_at,
    goal: p.goal,
    mpesa_receipt: p.mpesa_receipt,
    source: p.source,
    matched_status: p.matched_status,
    note: p.note,
    recorded_by: p.recorded_by,
    recorded_at: p.recorded_at,
  }));
}

// --- Notes, meetings and decisions ---

export async function addNote(userId: string, circleId: string, input: z.infer<typeof noteSchema>) {
  await member(userId, circleId);
  return prisma.circleNote.create({
    data: {
      circle_id: circleId,
      author_id: userId,
      body: input.body,
      kind: input.held_at ? "meeting" : "note",
      held_at: input.held_at ?? null,
    },
  });
}

export async function listNotes(userId: string, circleId: string) {
  await member(userId, circleId);
  return prisma.circleNote.findMany({
    where: { circle_id: circleId },
    include: { author: person },
    orderBy: { created_at: "desc" },
  });
}

function tally(decision: { id: string; question: string; status: string; created_at: Date; closed_at: Date | null; votes: { user_id: string; choice: string }[] }, userId: string, members: number) {
  const count = (choice: string) => decision.votes.filter((v) => v.choice === choice).length;
  return {
    id: decision.id,
    question: decision.question,
    status: decision.status,
    votes: { yes: count("yes"), no: count("no"), abstain: count("abstain"), not_voted: members - decision.votes.length },
    my_vote: decision.votes.find((v) => v.user_id === userId)?.choice ?? null,
    created_at: decision.created_at,
    closed_at: decision.closed_at,
  };
}

export async function addDecision(userId: string, circleId: string, question: string) {
  await member(userId, circleId);
  const decision = await prisma.circleDecision.create({ data: { circle_id: circleId, question, created_by: userId } });
  return { id: decision.id, question: decision.question, status: decision.status };
}

export async function listDecisions(userId: string, circleId: string) {
  await member(userId, circleId);
  const [decisions, members] = await Promise.all([
    prisma.circleDecision.findMany({ where: { circle_id: circleId }, include: { votes: true }, orderBy: { created_at: "desc" } }),
    prisma.circleMember.count({ where: { circle_id: circleId } }),
  ]);
  return decisions.map((d) => tally(d, userId, members));
}

// One vote each. A member may change her vote while the question is open.
export async function vote(userId: string, circleId: string, decisionId: string, choice: string) {
  await member(userId, circleId);
  const decision = await prisma.circleDecision.findFirst({ where: { id: decisionId, circle_id: circleId } });
  if (!decision) throw notFound("No such decision");
  if (decision.status !== "open") throw conflict("DECISION_CLOSED", "Voting on this has closed");

  await prisma.circleVote.upsert({
    where: { decision_id_user_id: { decision_id: decisionId, user_id: userId } },
    create: { decision_id: decisionId, user_id: userId, choice },
    update: { choice, voted_at: new Date() },
  });
  return (await listDecisions(userId, circleId)).find((d) => d.id === decisionId)!;
}

export async function closeDecision(userId: string, circleId: string, decisionId: string) {
  await organiser(userId, circleId);
  const { count } = await prisma.circleDecision.updateMany({
    where: { id: decisionId, circle_id: circleId, status: "open" },
    data: { status: "closed", closed_at: new Date() },
  });
  if (count === 0) throw notFound("No open decision with this id");
  return (await listDecisions(userId, circleId)).find((d) => d.id === decisionId)!;
}

// --- What makes a circle more than a ledger ---

// Funders that lend to or fund groups, and what stands between this
// circle and each of them. Plain lookups, no AI.
export async function groupFunding(userId: string, circleId: string) {
  const { circle } = await member(userId, circleId);
  const funders = await prisma.funder.findMany({
    where: {
      serves_groups: true,
      OR: [{ claimed_by_user_id: null }, { claimed_by: { approval_status: "approved" } }],
    },
    orderBy: { name: "asc" },
  });
  const items = await prisma.complianceItem.findMany({ where: { id: "group_registration" } });
  const registration = items[0];
  const registered = circle.registration_status === "registered";

  return {
    circle_id: circleId,
    registration_status: circle.registration_status,
    funders: funders.map((f) => {
      const needsRegistration = f.requirements.includes("group_registration") && !registered;
      return {
        id: f.id,
        name: f.name,
        kind: f.kind,
        mandate_text: f.mandate_text,
        ticket_min_kes: f.ticket_min_kes,
        ticket_max_kes: f.ticket_max_kes,
        how_to_apply_url: f.how_to_apply_url,
        source_url: f.source_url,
        last_verified_at: f.last_verified_at,
        is_demo: f.is_demo,
        group: needsRegistration ? "apply_after" : "apply_now",
        gaps: needsRegistration
          ? [{ ref: "group_registration", title: registration?.title ?? "Register the group", why: registration?.why ?? null, source_url: registration?.source_url ?? null }]
          : [],
      };
    }),
  };
}
