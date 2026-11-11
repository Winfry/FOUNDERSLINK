// The Copilot without a language model: the same tools, a fixed order of
// what matters most, and plain sentences. Used when no model is set up,
// when the founder has not agreed to her details going to an AI model, or
// when the model fails. It never guesses: every line comes from her data.

import type { ToolContext } from "./tools.js";

type Run = (ctx: ToolContext, name: string, args?: unknown) => Promise<unknown>;

interface Profile { has_profile: boolean; business_name?: string | null; profile_complete_percent?: number; missing_fields?: string[] }
interface Readiness { done: number; total: number; to_do: { id: string; title: string; status: string }[] }
interface Matches { approval_status?: string; matches: { investor: string; group: string; fits_because: string[]; fix_first: string[] }[] }
interface Experts { experts: { name: string; profession: string | null; sessions_left_this_month: number }[] }

export async function planWithRules(ctx: ToolContext, run: Run, firstName: string): Promise<string> {
  // Only claim a suggestion that was made now: one already on her list is not suggested again.
  const before = ctx.proposed.length;
  const suggestedNow = () => ctx.proposed.length > before;

  const profile = (await run(ctx, "get_business_profile")) as Profile;
  if (!profile.has_profile) {
    await run(ctx, "propose_task", { title: "Set up your business profile", detail: "Everything else (matches, readiness, experts) is built from it.", due_in_days: 2, link: "/founder/onboarding" });
    return `Hi ${firstName}. Let's start with your business profile: matches, your readiness checklist and expert suggestions are all built from it. ${suggestedNow() ? "I have suggested it as your first task." : "It is already on your task list."}`;
  }

  const readiness = (await run(ctx, "get_readiness_status")) as Readiness;
  const matches = (await run(ctx, "find_investor_matches", { limit: 3 })) as Matches;
  const experts = (await run(ctx, "find_relevant_experts")) as Experts;
  const verified = matches.approval_status === "approved";

  const lines: string[] = [];
  let n = 0;
  const step = (text: string) => lines.push(`${++n}. ${text}`);

  if (!verified) {
    step("Get verified. Investors can only see your name and reply once a person at FoundersLink has checked you.");
    await run(ctx, "propose_task", { title: "Finish verification", detail: "Confirm your phone and send a short statement about your business.", due_in_days: 3, link: "/founder/verify" });
  }

  const percent = profile.profile_complete_percent ?? 0;
  if (percent < 100) {
    const missing = (profile.missing_fields ?? []).slice(0, 3).join(", ");
    step(`Finish your business profile (${percent}% done${missing ? `; add ${missing}` : ""}). Investors read it before they decide to reach out.`);
    await run(ctx, "propose_task", { title: "Complete your business profile", detail: missing ? `Add: ${missing}.` : undefined, due_in_days: 5, link: "/founder/onboarding" });
  }

  const next = readiness.to_do.slice(0, 2);
  if (next.length > 0) {
    step(`Work on your readiness checklist (${readiness.done} of ${readiness.total} done). Start with ${next.map((i) => i.title).join(" and ")}.`);
    for (const item of next) {
      await run(ctx, "propose_task", { title: `Complete: ${item.title}`.slice(0, 80), due_in_days: 7, link: "/readiness" });
    }
  }

  const pitch = matches.matches.filter((m) => m.group === "pitch now");
  const fixFirst = matches.matches.filter((m) => m.group === "fix first");
  if (pitch.length > 0) {
    const m = pitch[0]!;
    step(`${m.investor} fits you now${m.fits_because[0] ? ` (${m.fits_because[0].toLowerCase()})` : ""}. ${verified ? "Look at their full fit and decide whether to connect." : "Once you are verified you can connect."}`);
  } else if (fixFirst.length > 0) {
    const m = fixFirst[0]!;
    step(`${m.investor} could fit you after one fix: ${m.fix_first[0] ?? "see the full fit"}.`);
  }

  const expert = experts.experts.find((e) => e.sessions_left_this_month > 0);
  if (expert) {
    step(`For anything legal or tax, ${expert.name}${expert.profession ? ` (${expert.profession})` : ""} has sessions free this month.`);
  }

  if (lines.length === 0) {
    return `Hi ${firstName}. You are in good shape: your profile is complete and nothing is waiting on your checklist. This week, look at the investors who fit you and keep your records up to date.`;
  }
  const close = suggestedNow()
    ? "I have suggested tasks for the most important ones. Approve the ones you want on your list."
    : "These are already on your task list.";
  return `Hi ${firstName}. Here is what I would focus on this week:\n\n${lines.join("\n")}\n\n${close}`;
}
