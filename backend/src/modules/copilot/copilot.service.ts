// The Founder Copilot (phase 1): one assistant that reads the founder's
// own business, readiness, matches and experts through its tools, plans
// what to do next, and may suggest tasks. It acts only through those tools,
// and its one write, a suggested task, waits for her approval. Every step
// is logged in copilot_events.

import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { AppError, notFound } from "../../shared/errors.js";
import { hasConsent } from "../account/consents.js";
import { complete, llmConfigured, type ChatMessage, type ToolSpec } from "./llm.js";
import { detectLanguage, planWithRules } from "./planner.js";
import { TOOLS, toolByName, type ToolContext } from "./tools.js";

export const askSchema = z.object({ message: z.string().trim().min(2, "Ask a question").max(1000) });
export const taskSchema = z.object({
  title: z.string().trim().min(3).max(80),
  due_date: z.iso.date().optional(),
});

/** A founder can ask this many times an hour: enough to work, not enough to run up a bill. */
export const ASKS_PER_HOUR = 30;
/** Tool rounds the model gets before the rules take over. */
const MAX_ROUNDS = 6;

const SYSTEM = `You are the FoundersLink Copilot, a business co-pilot for an early-stage founder in Kenya.
You help her decide what to do next to build her business and get ready for investors.

How you work:
- Before advising, read her data with your tools. Use only what the tools return; never invent facts, numbers, investors or experts.
- Give a short, prioritised plan in plain words (under 180 words), most important first, using her first name.
- Write plain text for a phone screen: numbered lines are fine, but no Markdown (no **, #, or _).
- When a step is worth doing, suggest it with propose_task (at most 3 per reply) before you write your answer. Mention a suggested task only if propose_task returned ok: true; if it says the task is already on her list, say that instead. Tell her suggestions are added to her list only when she approves them.
- For legal, tax or registration questions, point her to Ask Compliance (in Readiness) or to an expert from find_relevant_experts. You do not give legal advice.
- You cannot send messages, contact anyone, share documents, move money, or change chama records. Never say you did. If she asks, say what she can do herself in the app.
- Answer in the language she wrote in (English or Kiswahili).`;

const specs: ToolSpec[] = TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));

async function log(userId: string, kind: string, detail: Record<string, unknown>) {
  await prisma.copilotEvent.create({ data: { user_id: userId, kind, detail: detail as object } });
}

// Runs one tool as the founder, and logs what was used. Errors go back to
// the model as data, so it can explain, instead of failing the request.
async function runTool(ctx: ToolContext, name: string, args: unknown = {}) {
  const tool = toolByName.get(name);
  if (!tool) {
    await log(ctx.userId, "tool", { name, ok: false, error: "unknown tool" });
    return { error: `There is no tool called ${name}.` };
  }
  try {
    const result = await tool.run(ctx, args);
    await log(ctx.userId, "tool", { name, args: args ?? {}, ok: true });
    return result;
  } catch (e) {
    const error = e instanceof z.ZodError ? "The arguments were not valid." : "The tool failed.";
    await log(ctx.userId, "tool", { name, args: args ?? {}, ok: false, error });
    return { error };
  }
}

/**
 * The app shows the reply as plain text, so Markdown the model adds anyway
 * would show as stray symbols: drop bold/italic markers and heading marks,
 * and turn "* " bullets into "- ".
 */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s).,;:!?]|$)/gm, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(\s*)\*\s+/gm, "$1- ")
    .trim();
}

async function withModel(ctx: ToolContext, message: string, firstName: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `(The founder's first name is ${firstName}.)\n\n${message}` },
  ];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await complete(messages, specs);
    if (!reply.tool_calls?.length) {
      if (!reply.content?.trim()) throw new Error("The model sent an empty answer");
      return plainText(reply.content);
    }
    messages.push(reply);
    for (const call of reply.tool_calls) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      const result = await runTool(ctx, call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify(result) });
    }
  }
  throw new Error("The model did not finish within its tool rounds");
}

export async function ask(userId: string, input: z.infer<typeof askSchema>) {
  const since = new Date(Date.now() - 3600_000);
  const recent = await prisma.copilotEvent.count({ where: { user_id: userId, kind: "asked", created_at: { gte: since } } });
  if (recent >= ASKS_PER_HOUR) throw new AppError(429, "TOO_MANY_REQUESTS", "You have asked a lot this hour. Try again a little later.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { full_name: true } });
  const firstName = user.full_name.split(/\s+/)[0] || "there";
  await log(userId, "asked", { message: input.message });

  const ctx: ToolContext = { userId, proposed: [] };
  const lang = detectLanguage(input.message);
  // Her details go to an outside AI model only if she agreed to that.
  const mayUseModel = llmConfigured() && (await hasConsent(userId, "ai_matching"));
  let engine: "model" | "rules" = "rules";
  let reply: string;
  if (mayUseModel) {
    try {
      reply = await withModel(ctx, input.message, firstName);
      engine = "model";
    } catch (e) {
      await log(userId, "fallback", { reason: (e as Error).message.slice(0, 200) });
      reply = await planWithRules(ctx, runTool, firstName, lang);
    }
  } else {
    reply = await planWithRules(ctx, runTool, firstName, lang);
  }

  const proposals = ctx.proposed.length
    ? await prisma.founderTask.findMany({ where: { id: { in: ctx.proposed } }, orderBy: { created_at: "asc" } })
    : [];
  for (const t of proposals) await log(userId, "proposed", { task_id: t.id, title: t.title });
  await log(userId, "answered", { engine, proposals: proposals.length });

  return {
    reply,
    engine,
    proposals: proposals.map(publicTask),
    note:
      engine === "rules" && !mayUseModel && llmConfigured()
        ? lang === "sw"
          ? "Mpango huu umetokana na taarifa zako za FoundersLink bila kutumia AI ya nje, kwa sababu umezima matumizi ya AI kwa taarifa zako kwenye ridhaa zako."
          : "Planned from your FoundersLink data without an outside AI model, because AI use of your details is off in your consents."
        : null,
  };
}

export function publicTask(t: { id: string; title: string; detail: string | null; due_date: Date | null; status: string; source: string; link: string | null; created_at: Date }) {
  return {
    id: t.id,
    title: t.title,
    detail: t.detail,
    due_date: t.due_date?.toISOString().slice(0, 10) ?? null,
    status: t.status,
    source: t.source,
    link: t.link,
    created_at: t.created_at.toISOString(),
  };
}

export async function listTasks(userId: string) {
  const tasks = await prisma.founderTask.findMany({
    where: { user_id: userId, status: { in: ["proposed", "open", "done"] } },
    orderBy: [{ status: "asc" }, { due_date: "asc" }, { created_at: "desc" }],
    take: 60,
  });
  return tasks.map(publicTask);
}

const NEXT: Record<"approve" | "dismiss" | "done" | "reopen", { from: string[]; to: string; kind: string }> = {
  approve: { from: ["proposed"], to: "open", kind: "approved" },
  dismiss: { from: ["proposed", "open"], to: "dismissed", kind: "dismissed" },
  done: { from: ["open"], to: "done", kind: "done" },
  reopen: { from: ["done"], to: "open", kind: "reopened" },
};

// Only she can decide on her own tasks: every change is scoped to her id.
export async function decide(userId: string, taskId: string, action: keyof typeof NEXT) {
  const step = NEXT[action];
  const task = await prisma.founderTask.findFirst({ where: { id: taskId, user_id: userId } });
  if (!task) throw notFound("No such task");
  if (!step.from.includes(task.status)) throw new AppError(409, "WRONG_STATE", `This task is ${task.status}, so it cannot be ${step.kind}.`);
  const now = new Date();
  const updated = await prisma.founderTask.update({
    where: { id: task.id },
    data: {
      status: step.to,
      ...(action === "approve" || action === "dismiss" ? { decided_at: now } : {}),
      ...(action === "done" ? { done_at: now } : {}),
      ...(action === "reopen" ? { done_at: null } : {}),
    },
  });
  await log(userId, step.kind, { task_id: task.id, title: task.title });
  return publicTask(updated);
}

/** A task she adds herself: open straight away, no approval needed. */
export async function addTask(userId: string, input: z.infer<typeof taskSchema>) {
  const task = await prisma.founderTask.create({
    data: { user_id: userId, title: input.title, due_date: input.due_date ? new Date(input.due_date) : null, status: "open", source: "founder" },
  });
  return publicTask(task);
}

/** What the Copilot did, newest first, in plain words. */
export async function activity(userId: string) {
  const rows = await prisma.copilotEvent.findMany({ where: { user_id: userId }, orderBy: { created_at: "desc" }, take: 40 });
  const TOOL_WORDS: Record<string, string> = {
    get_business_profile: "Read your business profile",
    get_readiness_status: "Checked your readiness checklist",
    find_investor_matches: "Looked for investors who fit",
    find_relevant_experts: "Looked for experts who can help",
    list_my_tasks: "Read your task list",
    propose_task: "Suggested a task",
  };
  return rows
    .filter((r) => r.kind !== "fallback")
    .map((r) => {
      const d = r.detail as Record<string, unknown>;
      const text =
        r.kind === "asked" ? `You asked: “${String(d.message).slice(0, 120)}”`
        : r.kind === "tool" ? (TOOL_WORDS[String(d.name)] ?? "Used a tool")
        : r.kind === "proposed" ? `Suggested: ${d.title}`
        : r.kind === "approved" ? `You approved: ${d.title}`
        : r.kind === "dismissed" ? `You dismissed: ${d.title}`
        : r.kind === "done" ? `You finished: ${d.title}`
        : r.kind === "reopened" ? `You reopened: ${d.title}`
        : r.kind === "answered" ? (d.engine === "model" ? "Answered with the AI model" : "Answered from your data, without an AI model")
        : r.kind;
      return { id: r.id, kind: r.kind, text, at: r.created_at.toISOString() };
    });
}
