// Compliance (TEAM_DECISIONS D3): a founder's personal checklist, Ask
// Compliance, her deadlines, and the admin's view of how fresh our
// sources are. Deal compliance waits for deals.
//
// This is information, never legal advice, and progress is shown as
// "3 of 7 done", never as a score that implies a business is compliant.

import { z } from "zod";
import { answerCompliance, applicableItems } from "../../ai/client.js";
import type { ComplianceItem } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/db.js";
import { conflict, notFound } from "../../shared/errors.js";
import { hasConsent } from "../account/consents.js";
import { toMatchProfile } from "../funding/funding.service.js";
import { setStatus } from "./status.js";

export const STATUSES = ["not_started", "in_progress", "complete"] as const;

export const statusSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).nullable().optional(),
});

export const deadlineSchema = z.object({
  due_date: z.coerce.date(),
  recurrence: z.enum(["annual", "quarterly", "monthly"]).nullable().optional(),
});

export const askSchema = z.object({
  question: z.string().trim().min(5, "Ask a full question").max(500),
  language: z.enum(["en", "sw"]).default("en"),
});

export const feedbackSchema = z.object({ feedback: z.enum(["helpful", "not_helpful"]) });

const DISCLAIMER = "This is general information to help you find your way. It is not legal advice.";

// An item is due for review when its review date has passed. Until
// someone re-checks it, it is flagged and is not quoted in answers.
const needsReview = (item: ComplianceItem, now = new Date()) =>
  item.next_review_at !== null && item.next_review_at < now;

function publicItem(item: ComplianceItem) {
  return {
    id: item.id,
    title: item.title,
    why: item.why,
    institution: item.institution,
    documents_needed: item.documents_needed,
    when_to_get_help: item.when_to_get_help,
    jurisdiction_level: item.jurisdiction_level,
    recurrence: item.recurrence,
    source_url: item.source_url,
    last_verified_at: item.last_verified_at,
    needs_review: needsReview(item),
    is_demo: item.is_demo,
  };
}

async function founderProfile(userId: string) {
  const profile = await prisma.founderProfile.findUnique({ where: { user_id: userId } });
  if (!profile) throw conflict("PROFILE_REQUIRED", "Finish onboarding to see your compliance checklist");
  return profile;
}

// The items that apply to this founder's business, with her progress.
export async function getChecklist(userId: string) {
  const profile = await founderProfile(userId);
  const [items, statuses] = await Promise.all([
    prisma.complianceItem.findMany({ where: { scope: "business" }, orderBy: { title: "asc" } }),
    prisma.complianceStatus.findMany({ where: { entity_type: "business", entity_id: userId } }),
  ]);

  const useAi = await hasConsent(userId, "ai_matching");
  const { item_ids, engine } = await applicableItems(toMatchProfile(profile), items, "business", null, useAi);
  const applies = new Set(item_ids);
  const statusOf = new Map(statuses.map((s) => [s.item_id, s]));

  const checklist = items
    .filter((i) => applies.has(i.id))
    .map((i) => ({
      ...publicItem(i),
      status: statusOf.get(i.id)?.status ?? "not_started",
      note: statusOf.get(i.id)?.note ?? null,
    }));

  const done = checklist.filter((i) => i.status === "complete").length;

  // County rules differ, so we say when we have none for her county
  // instead of letting her assume another county's rules apply.
  const countyItems = items.filter((i) => i.jurisdiction_level === "county");
  const covered = countyItems.some((i) => applies.has(i.id));

  return {
    engine,
    progress: { done, total: checklist.length, text: `${done} of ${checklist.length} done` },
    county: {
      name: profile.county,
      covered,
      message: covered ? null : `County requirements for ${profile.county} are not covered yet. Check with your county government.`,
    },
    items: checklist,
    disclaimer: DISCLAIMER,
  };
}

async function businessItem(itemId: string) {
  const item = await prisma.complianceItem.findFirst({ where: { id: itemId, scope: "business" } });
  if (!item) throw notFound("No such compliance item");
  return item;
}

export async function getItem(userId: string, itemId: string) {
  const item = await businessItem(itemId);
  const key = { entity_type: "business", entity_id: userId, item_id: itemId };
  const [status, deadline] = await Promise.all([
    prisma.complianceStatus.findUnique({ where: { entity_type_entity_id_item_id: key } }),
    prisma.complianceDeadline.findUnique({ where: { entity_type_entity_id_item_id: key } }),
  ]);
  return {
    ...publicItem(item),
    status: status?.status ?? "not_started",
    note: status?.note ?? null,
    due_date: deadline?.due_date ?? null,
    disclaimer: DISCLAIMER,
  };
}

export async function updateStatus(userId: string, itemId: string, input: z.infer<typeof statusSchema>) {
  await founderProfile(userId);
  await businessItem(itemId);
  const saved = await setStatus(userId, itemId, input.status, input.note);
  return { item_id: itemId, status: saved.status, note: saved.note };
}

// The founder records when something of hers is due, e.g. a permit
// renewal. We do not make up dates: a deadline exists only if she set it.
export async function setDeadline(userId: string, itemId: string, input: z.infer<typeof deadlineSchema>) {
  await founderProfile(userId);
  const item = await businessItem(itemId);
  const key = { entity_type: "business", entity_id: userId, item_id: itemId };
  const recurrence = input.recurrence === undefined ? item.recurrence : input.recurrence;
  return prisma.complianceDeadline.upsert({
    where: { entity_type_entity_id_item_id: key },
    create: { ...key, due_date: input.due_date, recurrence, created_by: userId },
    // A new date means a new reminder is owed.
    update: { due_date: input.due_date, recurrence, reminder_sent_at: null },
  });
}

export async function listDeadlines(userId: string, now = new Date()) {
  const deadlines = await prisma.complianceDeadline.findMany({
    where: { entity_type: "business", entity_id: userId },
    include: { item: true },
    orderBy: { due_date: "asc" },
  });
  return deadlines.map((d) => ({
    item_id: d.item_id,
    title: d.item.title,
    due_date: d.due_date,
    recurrence: d.recurrence,
    overdue: d.due_date < now,
    source_url: d.item.source_url,
    last_verified_at: d.item.last_verified_at,
  }));
}

// Ask Compliance. Every question and answer is kept, with its citations,
// so the answers can be checked and improved.
export async function ask(userId: string, input: z.infer<typeof askSchema>) {
  const [profile, items] = await Promise.all([
    prisma.founderProfile.findUnique({ where: { user_id: userId } }),
    prisma.complianceItem.findMany(),
  ]);

  const result = await answerCompliance(
    input.question,
    input.language,
    // Without her consent the question is still answered, but her
    // business details are not sent along with it.
    profile && (await hasConsent(userId, "ai_matching")) ? toMatchProfile(profile) : null,
    items.map((i) => ({ ...i, needs_review: needsReview(i) })),
  );

  const logged = await prisma.complianceQuestion.create({
    data: {
      user_id: userId,
      question: input.question,
      language: input.language,
      answer: result.answer,
      citations: result.citations as object[],
      confident: result.confident,
      engine: result.engine,
    },
  });

  return { id: logged.id, ...result, disclaimer: DISCLAIMER };
}

export async function giveFeedback(userId: string, questionId: string, feedback: string) {
  // Scoped to the person who asked, so nobody rates another's question.
  const { count } = await prisma.complianceQuestion.updateMany({
    where: { id: questionId, user_id: userId },
    data: { feedback },
  });
  if (count === 0) throw notFound("No such question");
  return { id: questionId, feedback };
}

// For admins: how fresh every item is, with the ones needing attention first.
export async function sourcesReport() {
  const items = await prisma.complianceItem.findMany({ orderBy: { title: "asc" } });
  const rows = items.map((i) => ({
    id: i.id,
    title: i.title,
    scope: i.scope,
    institution: i.institution,
    owner: i.owner,
    source_url: i.source_url,
    last_verified_at: i.last_verified_at,
    next_review_at: i.next_review_at,
    finance_act_year: i.finance_act_year,
    is_demo: i.is_demo,
    flags: [
      ...(i.source_url ? [] : ["no_source"]),
      ...(i.last_verified_at ? [] : ["never_verified"]),
      ...(needsReview(i) ? ["review_due"] : []),
      ...(i.owner ? [] : ["no_owner"]),
    ],
  }));
  rows.sort((a, b) => b.flags.length - a.flags.length);

  return {
    total: rows.length,
    needing_attention: rows.filter((r) => r.flags.length > 0).length,
    items: rows,
  };
}
