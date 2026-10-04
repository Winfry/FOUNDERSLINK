// Deals (TEAM_DECISIONS D4): the record of a working relationship, from
// the first serious conversation to the result.
//
// A deal records what its parties tell it. It moves no money, drafts no
// legal document, and terms are self-reported. Every change is written
// to a timeline that every party can see.

import { z } from "zod";
import { KEEP_MS } from "../vetting/documents.js";
import { mustBeDealReady, scheduleDealDocumentDeletion } from "./due-diligence.js";
import { INSTRUMENTS } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { shareCircle } from "../circles/circles.service.js";
import { setEntityStatus } from "../compliance/status.js";
import { announceDealEvents } from "../messaging/messaging.service.js";
import { areConnected } from "../network/connections.js";

export const DEAL_TYPES = ["cofounder_partnership", "investment", "expert_engagement", "joint_venture"] as const;

// A deal moves through these in order, one step at a time.
export const STAGES = ["exploring", "due_diligence", "terms_agreed", "documents_compliance", "closed", "active"] as const;

// One person cannot agree terms or close a deal alone: these two stages
// are reached only when every party has confirmed.
const NEEDS_EVERYONE = new Set(["terms_agreed", "closed"]);

const STAGE_LABEL: Record<string, string> = {
  exploring: "Exploring",
  due_diligence: "Due diligence",
  terms_agreed: "Terms agreed",
  documents_compliance: "Documents & compliance",
  closed: "Closed",
  active: "Active",
};

const NOTICE =
  "FounderLink records this deal. The money moves between the parties through their bank, never through FounderLink, and the terms here are self-reported, not a legal document.";

export const createSchema = z.object({
  type: z.enum(DEAL_TYPES),
  title: z.string().trim().min(3).max(120),
  with_user_id: z.uuid(),
  source_funder_id: z.uuid().optional(),
});

export const partySchema = z.object({ user_id: z.uuid() });

export const stageSchema = z.object({
  to_stage: z.enum(STAGES),
  note: z.string().trim().max(500).optional(),
});

export const statusSchema = z.object({
  status: z.enum(["open", "paused", "declined"]),
  reason: z.string().trim().min(5, "Give a reason"),
});

// The key terms the parties have agreed. All optional, and nothing else
// is accepted, so the record stays readable.
export const termsSchema = z.strictObject({
  amount_kes: z.number().int().positive().max(2_000_000_000).optional(),
  instrument: z.enum(INSTRUMENTS).optional(),
  equity_percent: z.number().min(0).max(100).optional(),
  roles: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const milestoneSchema = z.object({
  title: z.string().trim().min(3).max(120),
  due_date: z.coerce.date().nullable().optional(),
});

export const milestonePatchSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  due_date: z.coerce.date().nullable().optional(),
  status: z.enum(["pending", "done"]).optional(),
});

export const sharingSchema = z.object({ share: z.boolean() });

export const checklistSchema = z.object({
  status: z.enum(["not_started", "in_progress", "complete"]),
  note: z.string().trim().max(500).nullable().optional(),
});

const withParties = {
  parties: { include: { user: { select: { id: true, full_name: true } } }, orderBy: { joined_at: "asc" } },
  milestones: { orderBy: { due_date: "asc" } },
} as const;

// Loads a deal for one of its parties. To anyone else it does not exist.
async function loadDeal(userId: string, dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, parties: { some: { user_id: userId } } },
    include: withParties,
  });
  if (!deal) throw notFound("No such deal");
  return deal;
}

type LoadedDeal = Awaited<ReturnType<typeof loadDeal>>;

function mustBeOpen(deal: LoadedDeal) {
  if (deal.status !== "open") throw conflict("DEAL_NOT_OPEN", `This deal is ${deal.status}`);
}

const nextStage = (stage: string) => STAGES[STAGES.indexOf(stage as (typeof STAGES)[number]) + 1] ?? null;

function view(deal: LoadedDeal) {
  return {
    id: deal.id,
    type: deal.type,
    title: deal.title,
    stage: deal.stage,
    stage_label: STAGE_LABEL[deal.stage],
    status: deal.status,
    next_stage: deal.status === "open" ? nextStage(deal.stage) : null,
    // A move every party must confirm, and who has still to do so.
    pending: deal.pending_stage && {
      to_stage: deal.pending_stage,
      waiting_for: deal.parties
        .filter((p) => p.confirmed_stage !== deal.pending_stage)
        .map((p) => ({ user_id: p.user_id, full_name: p.user.full_name })),
    },
    terms: deal.terms,
    parties: deal.parties.map((p) => ({
      user_id: p.user_id,
      full_name: p.user.full_name,
      role: p.role,
      shares_track_record: p.shares_track_record,
    })),
    milestones: deal.milestones,
    created_at: deal.created_at,
    closed_at: deal.closed_at,
    notice: NOTICE,
  };
}

async function approvedMember(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, approval_status: true } });
  if (!user || user.approval_status !== "approved" || user.role === "admin") throw notFound("No such member");
  return user;
}

export async function createDeal(userId: string, input: z.infer<typeof createSchema>) {
  if (input.with_user_id === userId) throw new AppError(400, "INVALID_TARGET", "A deal needs another party");
  const [me, other] = await Promise.all([approvedMember(userId), approvedMember(input.with_user_id)]);
  // A deal is between people who already have a relationship here: an
  // accepted connection, or a circle they are both in.
  const circleId = await shareCircle(userId, input.with_user_id);
  if (!circleId && !(await areConnected(userId, input.with_user_id))) {
    throw conflict("NOT_CONNECTED", "You can only open a deal with a connection or a member of one of your circles");
  }

  if (input.source_funder_id && !(await prisma.funder.findUnique({ where: { id: input.source_funder_id }, select: { id: true } }))) {
    throw new AppError(400, "UNKNOWN_FUNDER", "source_funder_id is not a funder record");
  }

  const opened = new Date();
  const deal = await prisma.deal.create({
    data: {
      type: input.type,
      title: input.title,
      source_funder_id: input.source_funder_id ?? null,
      circle_id: circleId,
      created_by: userId,
      parties: {
        // A millisecond apart, so the person who opened the deal is
        // always listed first.
        create: [
          { user_id: userId, role: me.role, joined_at: opened },
          { user_id: input.with_user_id, role: other.role, joined_at: new Date(opened.getTime() + 1) },
        ],
      },
      events: { create: { actor_id: userId, event: "opened", to_stage: "exploring" } },
    },
    include: withParties,
  });
  await announce(deal.id);
  return view(deal);
}

export async function listDeals(userId: string) {
  const deals = await prisma.deal.findMany({
    where: { parties: { some: { user_id: userId } } },
    include: withParties,
    orderBy: { created_at: "desc" },
  });
  return deals.map(view);
}

export async function getDeal(userId: string, dealId: string) {
  return view(await loadDeal(userId, dealId));
}

// Brings another approved member into the deal, e.g. a lawyer as adviser.
export async function addParty(userId: string, dealId: string, input: z.infer<typeof partySchema>) {
  const deal = await loadDeal(userId, dealId);
  mustBeOpen(deal);
  if (deal.parties.some((p) => p.user_id === input.user_id)) throw conflict("ALREADY_A_PARTY", "Already in this deal");

  const joiner = await approvedMember(input.user_id);
  if (!(await shareCircle(userId, input.user_id)) && !(await areConnected(userId, input.user_id))) {
    throw conflict("NOT_CONNECTED", "You can only add a connection or a member of one of your circles");
  }

  await prisma.$transaction([
    prisma.dealParty.create({ data: { deal_id: dealId, user_id: input.user_id, role: joiner.role } }),
    prisma.dealEvent.create({ data: { deal_id: dealId, actor_id: userId, event: "party_added", note: input.user_id } }),
  ]);
  await announce(dealId);
  return getDeal(userId, dealId);
}

// What happens when a deal actually arrives at a stage.
async function arrive(tx: Tx, deal: LoadedDeal, toStage: string, actorId: string, note?: string) {
  const closing = toStage === "closed";
  await tx.deal.update({
    where: { id: deal.id },
    data: { stage: toStage, pending_stage: null, ...(closing ? { closed_at: new Date() } : {}) },
  });
  await tx.dealParty.updateMany({ where: { deal_id: deal.id }, data: { confirmed_stage: null } });
  await tx.dealEvent.create({
    data: { deal_id: deal.id, actor_id: actorId, event: "stage_changed", from_stage: deal.stage, to_stage: toStage, note: note ?? null },
  });

  if (closing) {
    // Check-ins after closing, at 30, 90 and 180 days.
    const day = 24 * 60 * 60 * 1000;
    await tx.dealMilestone.createMany({
      data: [30, 90, 180].map((days) => ({
        deal_id: deal.id,
        title: `${days}-day check-in`,
        due_date: new Date(Date.now() + days * day),
      })),
    });
    await recordTrackRecord(tx, deal);
    // The shared documents have done their job: they go in 30 days.
    await tx.dealDocument.updateMany({
      where: { deal_id: deal.id, storage_key: { not: null } },
      data: { delete_after: new Date(Date.now() + KEEP_MS) },
    });
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// A closed investment becomes an entry on each investor's track record.
// It is the only way an entry can say "Verified on FounderLink", and it
// stays hidden until every party agrees to show it.
async function recordTrackRecord(tx: Tx, deal: LoadedDeal) {
  if (deal.type !== "investment") return;
  const founder = deal.parties.find((p) => p.role === "founder");
  if (!founder) return;
  const business = await tx.founderProfile.findUnique({ where: { user_id: founder.user_id } });
  const terms = deal.terms as { instrument?: string };

  for (const investor of deal.parties.filter((p) => p.role === "investor")) {
    await tx.portfolioEntry.create({
      data: {
        investor_id: investor.user_id,
        deal_id: deal.id,
        company_name: business?.business_name ?? deal.title,
        sector: business?.sector ?? "other",
        stage: business?.stage ?? null,
        year: new Date().getFullYear(),
        instrument: terms.instrument ?? null,
        source: "platform_deal",
        visibility: "hidden",
      },
    });
  }
}

// Moves the deal one stage forward, or, for a stage every party must
// agree to, proposes the move and counts the proposer as its first yes.
export async function proposeStage(userId: string, dealId: string, input: z.infer<typeof stageSchema>) {
  const deal = await loadDeal(userId, dealId);
  mustBeOpen(deal);
  if (input.to_stage !== nextStage(deal.stage)) {
    throw conflict("WRONG_STAGE", `The next stage after ${STAGE_LABEL[deal.stage]} is ${STAGE_LABEL[nextStage(deal.stage) ?? ""] ?? "none"}`);
  }
  if (deal.pending_stage) throw conflict("ALREADY_PROPOSED", "This move is already waiting for the other parties to confirm");
  // Level 3 (TEAM_DECISIONS D12): terms are agreed only between parties
  // who have shared their documents.
  if (input.to_stage === "terms_agreed") await mustBeDealReady(dealId);

  await prisma.$transaction(async (tx) => {
    if (!NEEDS_EVERYONE.has(input.to_stage)) return arrive(tx, deal, input.to_stage, userId, input.note);

    await tx.deal.update({ where: { id: dealId }, data: { pending_stage: input.to_stage } });
    await tx.dealParty.updateMany({ where: { deal_id: dealId }, data: { confirmed_stage: null } });
    await tx.dealParty.update({
      where: { deal_id_user_id: { deal_id: dealId, user_id: userId } },
      data: { confirmed_stage: input.to_stage },
    });
    await tx.dealEvent.create({
      data: { deal_id: dealId, actor_id: userId, event: "stage_proposed", from_stage: deal.stage, to_stage: input.to_stage, note: input.note ?? null },
    });
  });
  await announce(dealId);
  return getDeal(userId, dealId);
}

export async function confirmStage(userId: string, dealId: string) {
  const deal = await loadDeal(userId, dealId);
  mustBeOpen(deal);
  const pending = deal.pending_stage;
  if (!pending) throw conflict("NOTHING_TO_CONFIRM", "No stage change is waiting to be confirmed");
  // Checked again: a document may have been rejected since the proposal.
  if (pending === "terms_agreed") await mustBeDealReady(dealId);

  await prisma.$transaction(async (tx) => {
    await tx.dealParty.update({
      where: { deal_id_user_id: { deal_id: dealId, user_id: userId } },
      data: { confirmed_stage: pending },
    });
    await tx.dealEvent.create({ data: { deal_id: dealId, actor_id: userId, event: "stage_confirmed", to_stage: pending } });

    const everyone = deal.parties.every((p) => p.user_id === userId || p.confirmed_stage === pending);
    if (everyone) await arrive(tx, deal, pending, userId);
  });
  await announce(dealId);
  return getDeal(userId, dealId);
}

// Any party may pause or walk away, with a reason. Declined is final.
export async function setDealStatus(userId: string, dealId: string, input: z.infer<typeof statusSchema>) {
  const deal = await loadDeal(userId, dealId);
  if (deal.status === "declined") throw conflict("DEAL_DECLINED", "A declined deal cannot be reopened");
  if (deal.status === input.status) throw conflict("NO_CHANGE", `The deal is already ${input.status}`);

  await prisma.$transaction([
    // Anything waiting for confirmation is dropped: the deal's footing has changed.
    prisma.deal.update({ where: { id: dealId }, data: { status: input.status, pending_stage: null } }),
    prisma.dealParty.updateMany({ where: { deal_id: dealId }, data: { confirmed_stage: null } }),
    prisma.dealEvent.create({ data: { deal_id: dealId, actor_id: userId, event: input.status === "open" ? "resumed" : input.status, note: input.reason } }),
  ]);
  if (input.status === "declined") await scheduleDealDocumentDeletion(dealId);
  await announce(dealId);
  return getDeal(userId, dealId);
}

export async function updateTerms(userId: string, dealId: string, input: z.infer<typeof termsSchema>) {
  const deal = await loadDeal(userId, dealId);
  mustBeOpen(deal);
  if (STAGES.indexOf(deal.stage as (typeof STAGES)[number]) >= STAGES.indexOf("terms_agreed")) {
    throw conflict("TERMS_AGREED", "The terms were agreed by every party and can no longer be changed here");
  }

  const terms = { ...(deal.terms as object), ...input };
  await prisma.$transaction([
    // If the terms change while a move is waiting, earlier confirmations
    // were given for different terms, so they are withdrawn.
    prisma.deal.update({ where: { id: dealId }, data: { terms, pending_stage: null } }),
    prisma.dealParty.updateMany({ where: { deal_id: dealId }, data: { confirmed_stage: null } }),
    prisma.dealEvent.create({
      data: {
        deal_id: dealId,
        actor_id: userId,
        event: "terms_updated",
        note: deal.pending_stage ? "Confirmations were reset because the terms changed" : null,
      },
    }),
  ]);
  await announce(dealId);
  return getDeal(userId, dealId);
}

const EVENT_TEXT: Record<string, (name: string, e: { to_stage: string | null; note: string | null }) => string> = {
  opened: (n) => `${n} opened the deal`,
  party_added: (n) => `${n} added a party to the deal`,
  stage_proposed: (n, e) => `${n} proposed moving the deal to ${STAGE_LABEL[e.to_stage ?? ""]}`,
  stage_confirmed: (n, e) => `${n} confirmed the move to ${STAGE_LABEL[e.to_stage ?? ""]}`,
  stage_changed: (n, e) => `${n} moved the deal to ${STAGE_LABEL[e.to_stage ?? ""]}`,
  terms_updated: (n) => `${n} updated the terms`,
  paused: (n) => `${n} paused the deal`,
  declined: (n) => `${n} declined the deal`,
  resumed: (n) => `${n} resumed the deal`,
  milestone_added: (n, e) => `${n} added the milestone "${e.note}"`,
  checklist_updated: (n, e) => `${n} updated the checklist: ${e.note}`,
};

// Checklist and milestone changes stay on the timeline. The rest are
// also posted in the deal room, so parties see them where they talk.
const QUIET = new Set(["checklist_updated", "milestone_added", "stage_confirmed"]);

function announce(dealId: string) {
  return announceDealEvents(dealId, (e) => (QUIET.has(e.event) ? null : (EVENT_TEXT[e.event]?.(e.actor, e) ?? null)));
}

export async function getTimeline(userId: string, dealId: string) {
  await loadDeal(userId, dealId);
  const events = await prisma.dealEvent.findMany({
    where: { deal_id: dealId },
    include: { actor: { select: { id: true, full_name: true } } },
    orderBy: { created_at: "asc" },
  });
  return events.map((e) => ({
    id: e.id,
    event: e.event,
    text: EVENT_TEXT[e.event]?.(e.actor.full_name, e) ?? e.event,
    actor: e.actor,
    from_stage: e.from_stage,
    to_stage: e.to_stage,
    note: e.note,
    created_at: e.created_at,
  }));
}

export async function addMilestone(userId: string, dealId: string, input: z.infer<typeof milestoneSchema>) {
  await loadDeal(userId, dealId);
  const [milestone] = await prisma.$transaction([
    prisma.dealMilestone.create({ data: { deal_id: dealId, title: input.title, due_date: input.due_date ?? null } }),
    prisma.dealEvent.create({ data: { deal_id: dealId, actor_id: userId, event: "milestone_added", note: input.title } }),
  ]);
  return milestone;
}

export async function updateMilestone(userId: string, dealId: string, milestoneId: string, input: z.infer<typeof milestonePatchSchema>) {
  await loadDeal(userId, dealId);
  // Scoped to this deal, so a milestone id from another deal does nothing.
  const { count } = await prisma.dealMilestone.updateMany({ where: { id: milestoneId, deal_id: dealId }, data: input });
  if (count === 0) throw notFound("No such milestone");
  return prisma.dealMilestone.findUniqueOrThrow({ where: { id: milestoneId } });
}

// Each party says whether the closed deal may show on track records. It
// shows, and names the company, only when all of them agree.
export async function setSharing(userId: string, dealId: string, share: boolean) {
  await loadDeal(userId, dealId);
  await prisma.dealParty.update({
    where: { deal_id_user_id: { deal_id: dealId, user_id: userId } },
    data: { shares_track_record: share },
  });

  const parties = await prisma.dealParty.findMany({ where: { deal_id: dealId } });
  const everyone = parties.every((p) => p.shares_track_record);
  await prisma.portfolioEntry.updateMany({
    where: { deal_id: dealId },
    data: { visibility: everyone ? "public" : "hidden", company_consented: everyone },
  });
  return { deal_id: dealId, you_share: share, shown_on_track_records: everyone };
}

// The checklist for this type of deal (TEAM_DECISIONS D3.3).
export async function getDealChecklist(userId: string, dealId: string) {
  const deal = await loadDeal(userId, dealId);
  const [items, statuses] = await Promise.all([
    prisma.complianceItem.findMany({ where: { scope: "deal", deal_type: deal.type }, orderBy: { id: "asc" } }),
    prisma.complianceStatus.findMany({ where: { entity_type: "deal", entity_id: dealId } }),
  ]);
  const statusOf = new Map(statuses.map((s) => [s.item_id, s]));

  const checklist = items.map((i) => ({
    id: i.id,
    title: i.title,
    why: i.why,
    when_to_get_help: i.when_to_get_help,
    source_url: i.source_url,
    last_verified_at: i.last_verified_at,
    is_demo: i.is_demo,
    status: statusOf.get(i.id)?.status ?? "not_started",
    note: statusOf.get(i.id)?.note ?? null,
  }));
  const done = checklist.filter((i) => i.status === "complete").length;

  return {
    deal_id: dealId,
    deal_type: deal.type,
    progress: { done, total: checklist.length, text: `${done} of ${checklist.length} done` },
    items: checklist,
    disclaimer: "FounderLink records and guides. It does not draft legal documents or give legal advice.",
  };
}

export async function updateDealChecklist(userId: string, dealId: string, itemId: string, input: z.infer<typeof checklistSchema>) {
  const deal = await loadDeal(userId, dealId);
  const item = await prisma.complianceItem.findFirst({ where: { id: itemId, scope: "deal", deal_type: deal.type } });
  if (!item) throw notFound("This item is not on this deal's checklist");

  const saved = await setEntityStatus("deal", dealId, itemId, input.status, userId, input.note);
  await prisma.dealEvent.create({
    data: { deal_id: dealId, actor_id: userId, event: "checklist_updated", note: `${item.title} is ${input.status.replace("_", " ")}` },
  });
  return { item_id: itemId, status: saved.status, note: saved.note };
}
