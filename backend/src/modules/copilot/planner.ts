// The Copilot without a language model: the same tools, a fixed order of
// what matters most, and plain sentences. Used when no model is set up,
// when the founder has not agreed to her details going to an AI model, or
// when the model fails. It never guesses: every line comes from her data.
//
// It answers in the language she asked in, English or Kiswahili, and its
// tools name readiness items in that language too. Task titles stay in
// English, so the same task is recognised however she asked. Investor
// names are quoted as they are.

import type { Lang } from "../compliance/language.js";
import type { ToolContext } from "./tools.js";

export type { Lang };
type Run = (ctx: ToolContext, name: string, args?: unknown) => Promise<unknown>;

interface Profile { has_profile: boolean; business_name?: string | null; profile_complete_percent?: number; missing_fields?: string[] }
// title is in the language of the question; title_en is there when that is not English.
interface Readiness { done: number; total: number; to_do: { id: string; title: string; title_en?: string; status: string }[] }
interface Matches { approval_status?: string; matches: { investor: string; group: string; fits_because: string[]; fix_first: string[] }[] }
interface Experts { experts: { name: string; profession: string | null; sessions_left_this_month: number }[] }

// Common Kiswahili words, and the English ones a short question is made of.
// A question is Kiswahili when it has at least as many of the first as the
// second, so "Nifanye nini this week?" is answered in Kiswahili.
const SW = new Set(
  ("nini gani je vipi lini wapi nani kwa ya wa za la cha vya na ni si kuna hakuna sasa kwanza tafadhali habari jambo " +
    "nifanye nifanyeje nianze ninahitaji nataka naomba nipate nisaidie nieleze unaweza ili kama lakini pia hii huu hiki hizi wiki leo kesho mwezi " +
    "biashara kampuni mwekezaji wawekezaji mtaji pesa fedha mkopo msaada usajili kodi leseni wasifu orodha kazi utayari mtaalamu wataalamu chama " +
    "yangu wangu langu changu zangu vyangu kufanya kupata kuanza kusajili kukuza kuandaa kujiandaa")
    .split(" "),
);
const EN = new Set(
  "what which how why when where who should can could would do does is are am i my me we our you your the a an to for of and in on this that next first week help focus get ready need want please"
    .split(" "),
);

export function detectLanguage(text: string): Lang {
  const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const sw = tokens.filter((t) => SW.has(t)).length;
  const en = tokens.filter((t) => EN.has(t)).length;
  return sw > 0 && sw >= en ? "sw" : "en";
}

// Profile field names, as get_business_profile lists the missing ones.
const FIELD_SW: Record<string, string> = {
  "business name": "jina la biashara",
  description: "maelezo ya biashara",
  sector: "sekta",
  county: "kaunti",
  stage: "hatua ya biashara",
  "funding amount kes": "kiasi cha fedha unachotafuta",
  "use of funds": "matumizi ya fedha",
  "year started": "mwaka ulioanza",
  website: "tovuti",
};

const TEXT = {
  en: {
    startProfile: (name: string, now: boolean) =>
      `Hi ${name}. Let's start with your business profile: matches, your readiness checklist and expert suggestions are all built from it. ${now ? "I have suggested it as your first task." : "It is already on your task list."}`,
    verify: "Get verified. Investors can only see your name and reply once a person at FoundersLink has checked you.",
    profile: (percent: number, missing: string) =>
      `Finish your business profile (${percent}% done${missing ? `; add ${missing}` : ""}). Investors read it before they decide to reach out.`,
    field: (f: string) => f,
    readiness: (done: number, total: number, first: string) => `Work on your readiness checklist (${done} of ${total} done). Start with ${first}.`,
    and: " and ",
    pitch: (investor: string, reason: string | undefined, verified: boolean) =>
      `${investor} fits you now${reason ? ` (${reason.toLowerCase()})` : ""}. ${verified ? "Look at their full fit and decide whether to connect." : "Once you are verified you can connect."}`,
    fixFirst: (investor: string, fix: string | undefined) => `${investor} could fit you after one fix: ${fix ?? "see the full fit"}.`,
    expert: (name: string, profession: string | null) => `For anything legal or tax, ${name}${profession ? ` (${profession})` : ""} has sessions free this month.`,
    goodShape: (name: string) =>
      `Hi ${name}. You are in good shape: your profile is complete and nothing is waiting on your checklist. This week, look at the investors who fit you and keep your records up to date.`,
    plan: (name: string, lines: string, now: boolean) =>
      `Hi ${name}. Here is what I would focus on this week:\n\n${lines}\n\n${now ? "I have suggested tasks for the most important ones. Approve the ones you want on your list." : "These are already on your task list."}`,
  },
  sw: {
    startProfile: (name: string, now: boolean) =>
      `Habari ${name}. Tuanze na wasifu wa biashara yako: wawekezaji wanaokufaa, orodha yako ya utayari na mapendekezo ya wataalamu yote yanatokana nao. ${now ? "Nimeupendekeza kama kazi yako ya kwanza." : "Tayari uko kwenye orodha yako ya kazi."}`,
    verify: "Thibitishwa kwanza. Wawekezaji wanaweza kuona jina lako na kukujibu tu baada ya mtu wa FoundersLink kukukagua.",
    profile: (percent: number, missing: string) =>
      `Kamilisha wasifu wa biashara yako (umekamilika kwa ${percent}%${missing ? `; ongeza ${missing}` : ""}). Wawekezaji huusoma kabla ya kuamua kuwasiliana nawe.`,
    field: (f: string) => FIELD_SW[f] ?? f,
    readiness: (done: number, total: number, first: string) => `Shughulikia orodha yako ya utayari (${done} kati ya ${total} vimekamilika). Anza na ${first}.`,
    and: " na ",
    // Her match reasons come in English, so they are left out here.
    pitch: (investor: string, _reason: string | undefined, verified: boolean) =>
      `${investor} anakufaa sasa. ${verified ? "Angalia jinsi mnavyoendana kisha uamue kama utawasiliana naye." : "Ukishathibitishwa utaweza kuwasiliana naye."}`,
    fixFirst: (investor: string, fix: string | undefined) => `${investor} anaweza kukufaa baada ya kurekebisha jambo moja: ${fix ?? "angalia maelezo kamili"}.`,
    expert: (name: string, profession: string | null) => `Kwa masuala ya kisheria au kodi, ${name}${profession ? ` (${profession})` : ""} ana nafasi za mazungumzo mwezi huu.`,
    goodShape: (name: string) =>
      `Habari ${name}. Uko katika hali nzuri: wasifu wako umekamilika na hakuna kinachosubiri kwenye orodha yako ya utayari. Wiki hii, angalia wawekezaji wanaokufaa na uendelee kuweka kumbukumbu zako sawa.`,
    plan: (name: string, lines: string, now: boolean) =>
      `Habari ${name}. Haya ndiyo ningezingatia wiki hii:\n\n${lines}\n\n${now ? "Nimependekeza kazi kwa yale muhimu zaidi. Kubali zile unazotaka ziwe kwenye orodha yako." : "Haya tayari yako kwenye orodha yako ya kazi."}`,
  },
};

export async function planWithRules(ctx: ToolContext, run: Run, firstName: string, lang: Lang = "en"): Promise<string> {
  const t = TEXT[lang];
  // Only claim a suggestion that was made now: one already on her list is not suggested again.
  const before = ctx.proposed.length;
  const suggestedNow = () => ctx.proposed.length > before;

  const profile = (await run(ctx, "get_business_profile")) as Profile;
  if (!profile.has_profile) {
    await run(ctx, "propose_task", { title: "Set up your business profile", detail: "Everything else (matches, readiness, experts) is built from it.", due_in_days: 2, link: "/founder/onboarding" });
    return t.startProfile(firstName, suggestedNow());
  }

  const readiness = (await run(ctx, "get_readiness_status")) as Readiness;
  const matches = (await run(ctx, "find_investor_matches", { limit: 3 })) as Matches;
  const experts = (await run(ctx, "find_relevant_experts")) as Experts;
  const verified = matches.approval_status === "approved";

  const lines: string[] = [];
  let n = 0;
  const step = (text: string) => lines.push(`${++n}. ${text}`);

  if (!verified) {
    step(t.verify);
    await run(ctx, "propose_task", { title: "Finish verification", detail: "Confirm your phone and send a short statement about your business.", due_in_days: 3, link: "/founder/verify" });
  }

  const percent = profile.profile_complete_percent ?? 0;
  if (percent < 100) {
    const missingFields = (profile.missing_fields ?? []).slice(0, 3);
    step(t.profile(percent, missingFields.map(t.field).join(", ")));
    await run(ctx, "propose_task", { title: "Complete your business profile", detail: missingFields.length ? `Add: ${missingFields.join(", ")}.` : undefined, due_in_days: 5, link: "/founder/onboarding" });
  }

  const next = readiness.to_do.slice(0, 2);
  if (next.length > 0) {
    step(t.readiness(readiness.done, readiness.total, next.map((i) => i.title).join(t.and)));
    for (const item of next) {
      await run(ctx, "propose_task", { title: `Complete: ${item.title_en ?? item.title}`.slice(0, 80), due_in_days: 7, link: "/readiness" });
    }
  }

  const pitch = matches.matches.filter((m) => m.group === "pitch now");
  const fixFirst = matches.matches.filter((m) => m.group === "fix first");
  if (pitch.length > 0) {
    const m = pitch[0]!;
    step(t.pitch(m.investor, m.fits_because[0], verified));
  } else if (fixFirst.length > 0) {
    const m = fixFirst[0]!;
    step(t.fixFirst(m.investor, m.fix_first[0]));
  }

  const expert = experts.experts.find((e) => e.sessions_left_this_month > 0);
  if (expert) step(t.expert(expert.name, expert.profession));

  if (lines.length === 0) return t.goodShape(firstName);
  return t.plan(firstName, lines.join("\n"), suggestedNow());
}
