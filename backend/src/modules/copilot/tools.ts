// The Founder Copilot's tools: the only way it can see or change anything.
//
// Every tool runs as the signed-in founder and only on her own records:
// the user id comes from her session, never from the model. The model
// chooses which tool to call and with what words; it cannot name another
// user, and nothing here moves money, touches a chama, contacts anyone or
// shares a document. The one tool that writes, propose_task, only creates
// a suggestion, which becomes a real task when she approves it.

import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { getChecklist } from "../compliance/compliance.service.js";
import { suggestExperts } from "../experts/experts.service.js";
import { getMatches } from "../funding/funding.service.js";

export interface ToolContext {
  userId: string;
  /** Tasks proposed during this request, so the reply can show them for approval. */
  proposed: string[];
}

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema for the arguments, as the model sees it. */
  parameters: Record<string, unknown>;
  run(ctx: ToolContext, args: unknown): Promise<unknown>;
}

/** At most this many suggestions per request, so a reply stays readable. */
export const MAX_PROPOSALS = 5;

const words = (id: string | null | undefined) => (id ? id.replace(/_/g, " ") : null);

// How complete her profile is: the fields investors read first.
function completeness(p: Record<string, unknown>) {
  const fields = ["business_name", "description", "sector", "county", "stage", "funding_amount_kes", "use_of_funds", "year_started", "website"];
  const filled = fields.filter((f) => p[f] !== null && p[f] !== undefined && p[f] !== "").length;
  return { percent: Math.round((filled / fields.length) * 100), missing: fields.filter((f) => !p[f]).map((f) => f.replace(/_/g, " ")) };
}

export const TOOLS: Tool[] = [
  {
    name: "get_business_profile",
    description: "Read the founder's own business profile: name, sector, stage, county, funding goal, and which profile fields are missing.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(ctx) {
      const p = await prisma.founderProfile.findUnique({ where: { user_id: ctx.userId } });
      if (!p) return { has_profile: false, note: "She has not set up her business profile yet." };
      const { percent, missing } = completeness(p as unknown as Record<string, unknown>);
      return {
        has_profile: true,
        business_name: p.business_name,
        sector: words(p.sector),
        stage: words(p.stage),
        county: p.county,
        funding_goal_kes: p.funding_amount_kes,
        use_of_funds: p.use_of_funds,
        has_employees: p.has_employees,
        handles_personal_data: p.handles_personal_data,
        description: p.description.slice(0, 400),
        profile_complete_percent: percent,
        missing_fields: missing,
      };
    },
  },
  {
    name: "get_readiness_status",
    description: "Read the founder's compliance and readiness checklist: how many items are done, and the items still to do.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(ctx) {
      try {
        const c = await getChecklist(ctx.userId);
        return {
          done: c.progress.done,
          total: c.progress.total,
          to_do: c.items.filter((i) => i.status !== "complete").map((i) => ({ id: i.id, title: i.title, status: i.status, why: i.why })),
          county_note: c.county.message,
        };
      } catch {
        return { done: 0, total: 0, to_do: [], note: "No checklist yet: it is built from her business profile." };
      }
    },
  },
  {
    name: "find_investor_matches",
    description: "Find the investors whose interests fit the founder's business, best first, with why they fit and what to fix first.",
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 5, description: "How many to return (1-5)." } },
      additionalProperties: false,
    },
    async run(ctx, args) {
      const { limit = 3 } = z.object({ limit: z.number().int().min(1).max(5).optional() }).parse(args ?? {});
      try {
        const m = await getMatches(ctx.userId);
        const name = (c: (typeof m.apply_now)[number]) => (c.anonymised ? c.headline : (c.funder.name ?? c.headline));
        const pick = (list: typeof m.apply_now, group: string) =>
          list.map((c) => ({
            investor: name(c),
            group,
            band: c.band,
            fits_because: c.reasons.filter((r) => r.fits).map((r) => r.text).slice(0, 2),
            fix_first: c.gaps.map((g) => g.title).slice(0, 2),
          }));
        return {
          approval_status: m.approval_status,
          matches: [...pick(m.apply_now, "pitch now"), ...pick(m.apply_after, "fix first")].slice(0, limit),
          note: m.locked?.message ?? null,
        };
      } catch {
        return { matches: [], note: "Matches need a business profile first." };
      }
    },
  },
  {
    name: "find_relevant_experts",
    description: "Find verified experts (lawyers, accountants, advisers) whose sectors and counties fit the founder's business.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(ctx) {
      const p = await prisma.founderProfile.findUnique({ where: { user_id: ctx.userId }, select: { sector: true, county: true } });
      const experts = await suggestExperts(p);
      return {
        experts: experts.map((e) => ({
          name: e.full_name,
          profession: words(e.profession),
          services: e.services,
          sessions_left_this_month: e.office_hours.left_this_month,
        })),
      };
    },
  },
  {
    name: "list_my_tasks",
    description: "List the founder's open tasks and suggestions waiting for her approval.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(ctx) {
      const tasks = await prisma.founderTask.findMany({
        where: { user_id: ctx.userId, status: { in: ["proposed", "open"] } },
        orderBy: { created_at: "desc" },
        take: 20,
      });
      return { tasks: tasks.map((t) => ({ title: t.title, status: t.status, due: t.due_date?.toISOString().slice(0, 10) ?? null })) };
    },
  },
  {
    name: "propose_task",
    description:
      "Suggest one task to add to the founder's to-do list. It is only a suggestion: it is added when she approves it. Use short, concrete titles that start with a verb.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "What to do, starting with a verb, under 80 characters." },
        detail: { type: "string", description: "One or two sentences on why and how." },
        due_in_days: { type: "integer", minimum: 1, maximum: 60, description: "When it should be done, in days from today." },
        link: {
          type: "string",
          enum: ["/readiness", "/matches", "/connections", "/founder/onboarding", "/founder/verify", "/chamas"],
          description: "Where in the app it is done.",
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
    async run(ctx, args) {
      const a = z
        .object({
          title: z.string().trim().min(3).max(80),
          detail: z.string().trim().max(300).optional(),
          due_in_days: z.number().int().min(1).max(60).optional(),
          link: z.enum(["/readiness", "/matches", "/connections", "/founder/onboarding", "/founder/verify", "/chamas"]).optional(),
        })
        .parse(args);
      if (ctx.proposed.length >= MAX_PROPOSALS) return { ok: false, note: `No more than ${MAX_PROPOSALS} suggestions at a time.` };
      // The same open or suggested task is not suggested twice.
      const same = await prisma.founderTask.findFirst({
        where: { user_id: ctx.userId, status: { in: ["proposed", "open"] }, title: { equals: a.title, mode: "insensitive" } },
      });
      if (same) return { ok: false, note: "That task is already on her list." };
      const due = a.due_in_days ? new Date(Date.now() + a.due_in_days * 86400000) : null;
      const task = await prisma.founderTask.create({
        data: { user_id: ctx.userId, title: a.title, detail: a.detail ?? null, due_date: due, link: a.link ?? null, status: "proposed", source: "copilot" },
      });
      ctx.proposed.push(task.id);
      return { ok: true, note: "Suggested. It is added to her list when she approves it." };
    },
  },
];

export const toolByName = new Map(TOOLS.map((t) => [t.name, t]));
