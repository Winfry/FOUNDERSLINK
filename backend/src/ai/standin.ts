// Rule-based stand-in for the AI service. It keeps the funding flow
// working before the real service is reachable, and takes over if a call
// to it fails. It is plain rules, not AI, and responses say so through
// the `engine` field.

import { COUNTIES } from "../shared/constants.js";
import type {
  AnswerSource,
  ApplicableItem,
  Band,
  ComplianceAnswer,
  Extraction,
  FitExplanation,
  MatchFunder,
  MatchProfile,
  MatchResult,
  ModerationResult,
  Reason,
  RiskAssessment,
  RiskInput,
  TrackRecordItem,
} from "./types.js";

export const kes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

const list = (items: string[]) => items.map((i) => i.replaceAll("_", " ")).join(", ");

const JOURNEY_LABEL: Record<string, string> = { startup: "startups", sme: "small businesses" };

// How much each signal counts towards the score. Instruments are a
// preference, so a mismatch lowers the score but does not rule a funder out.
const WEIGHTS: Record<string, number> = {
  journey: 0.2,
  sector: 0.25,
  stage: 0.15,
  county: 0.15,
  amount: 0.2,
  instrument: 0.05,
};
const PREFERENCE_ONLY = new Set(["instrument"]);

function assess(p: MatchProfile, f: MatchFunder): MatchResult {
  const reasons: Reason[] = [];
  let earned = 0;
  let possible = 0;
  let softMisses = 0;
  // `credit` is the share of the signal's weight earned: 1 for a fit,
  // 0 for a miss, and something between when we cannot tell.
  const add = (signal: string, fits: boolean, text: string, credit = fits ? 1 : 0) => {
    reasons.push({ signal, fits, text });
    const weight = WEIGHTS[signal] ?? 0;
    possible += weight;
    earned += weight * credit;
    if (credit < 1) softMisses += 1;
  };

  const funded = f.journey_types.map((j) => JOURNEY_LABEL[j] ?? j).join(" and ");
  const mine = JOURNEY_LABEL[p.journey_type] ?? p.journey_type;
  if (f.journey_types.includes(p.journey_type)) add("journey", true, `Funds ${mine}`);
  else add("journey", false, `Funds ${funded}, not ${mine}`);

  if (f.sectors.length === 0) add("sector", true, "Open to all sectors");
  else if (f.sectors.includes(p.sector)) add("sector", true, `Funds ${p.sector} businesses`);
  else add("sector", false, `Focuses on ${list(f.sectors)}, not ${p.sector}`);

  if (f.stages.length === 0) add("stage", true, "Open to any stage");
  else if (p.stage && f.stages.includes(p.stage))
    add("stage", true, `Funds businesses at the ${list([p.stage])} stage`);
  else add("stage", false, `Funds businesses at these stages: ${list(f.stages)}`);

  if (f.counties.length === 0) add("county", true, "Available nationwide");
  else if (f.counties.includes(p.county)) add("county", true, `Available in ${p.county}`);
  else add("county", false, `Only available in ${f.counties.join(", ")}`);

  const range = `${kes(f.ticket_min_kes)} to ${kes(f.ticket_max_kes)}`;
  const need = p.funding_amount_kes;
  if (need === null) add("amount", true, `You have not said how much you need. They fund ${range}`, 0.5);
  else if (need < f.ticket_min_kes)
    add("amount", false, `You need ${kes(need)}; their minimum is ${kes(f.ticket_min_kes)}`);
  else if (need > f.ticket_max_kes)
    add("amount", false, `You need ${kes(need)}; their maximum is ${kes(f.ticket_max_kes)}`);
  else add("amount", true, `Your ${kes(need)} is within their range of ${range}`);

  if (p.instruments.length > 0) {
    const shared = f.instruments.filter((i) => p.instruments.includes(i));
    if (shared.length > 0) add("instrument", true, `Offers ${list(shared)}, which you are open to`);
    else add("instrument", false, `Offers ${list(f.instruments)}; you asked for ${list(p.instruments)}`);
  }

  const ruledOut = reasons.some((r) => !r.fits && !PREFERENCE_ONLY.has(r.signal));
  const score = Math.round((earned / possible) * 100) / 100;
  // Not ruled out means every miss left is a soft one: a preference that
  // does not match, or something the founder has not told us.
  const band: Band = ruledOut ? "not_a_fit" : softMisses === 0 ? "strong" : softMisses === 1 ? "good" : "possible";

  // Say why it fits, or why it does not.
  const shown = reasons.filter((r) => r.fits !== ruledOut);
  const explanation = `${shown.map((r) => r.text).join(". ")}.`;

  return { funder_id: f.id, band, score, reasons, explanation };
}

export function matchFunders(profile: MatchProfile, funders: MatchFunder[]): MatchResult[] {
  return funders.map((f) => assess(profile, f));
}

const times = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The fit behind one profile page, plus what in the funder's track
// record is relevant to this founder.
export function explainFit(profile: MatchProfile, funder: MatchFunder, track: TrackRecordItem[]): FitExplanation {
  const match = assess(profile, funder);

  const highlights: string[] = [];
  const sameSector = track.filter((t) => t.sector === profile.sector).length;
  if (sameSector > 0) {
    highlights.push(`Has backed ${times(sameSector, `${profile.sector} business`, `${profile.sector} businesses`)} before`);
  }
  const sameStage = track.filter((t) => profile.stage !== null && t.stage === profile.stage).length;
  if (sameStage > 0) {
    highlights.push(`Has invested at the ${list([profile.stage!])} stage ${times(sameStage, "time", "times")}`);
  }

  return {
    band: match.band,
    components: match.reasons,
    reasons: [match.explanation],
    track_record_highlights: highlights,
  };
}

const SCAM_PHRASES: [RegExp, string][] = [
  [/(processing|registration|facilitation|upfront|application) fees?/i, "Mentions a fee that people must pay"],
  [/guaranteed? (returns?|funding|approval|profits?)/i, "Promises guaranteed returns or funding"],
  [/send (the |your )?money|pay (via|through|by) m-?pesa/i, "Asks for money to be sent"],
];

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "trashmail.com",
]);

// Sorts the review queue and tells the admin what to look at. It never
// approves or rejects anyone.
export function riskSignals(input: RiskInput): RiskAssessment {
  const signals: string[] = [];
  const text = `${input.statement ?? ""} ${input.bio ?? ""}`;

  const scamPhrases = SCAM_PHRASES.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  signals.push(...scamPhrases);

  if (DISPOSABLE_EMAIL_DOMAINS.has(input.email_domain)) signals.push("Uses a disposable email address");
  if (input.role === "investor" && !input.organisation_website) {
    signals.push("Investor gave no organisation website to check");
  }

  const risk_level = scamPhrases.length > 0 || signals.length >= 2 ? "high" : signals.length === 1 ? "medium" : "low";
  return { risk_level, signals };
}

const SECTOR_WORDS: Record<string, RegExp> = {
  health: /\b(clinic|hospital|health|afya|dawa|pharmacy|chemist)/i,
  agri: /\b(farm|shamba|agri|kilimo|mifugo|dairy|poultry|kuku)/i,
  fintech: /\b(fintech|payments?|mobile money|lending)/i,
  climate: /\b(climate|solar|recycl|clean energy|waste)/i,
  retail: /\b(shop|duka|salon|kinyozi|boutique|mitumba|kiosk|retail)/i,
  education: /\b(school|tutor|edtech|elimu|learning)/i,
  logistics: /\b(delivery|logistics|boda|transport|courier)/i,
};


const MULTIPLIER: Record<string, number> = {
  k: 1_000,
  elfu: 1_000,
  m: 1_000_000,
  million: 1_000_000,
  milioni: 1_000_000,
};

function findAmount(text: string): number | undefined {
  let best: number | undefined;
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)*)\s*(k|m|million|milioni|elfu)?\b/gi)) {
    const unit = m[2]?.toLowerCase();
    // With a unit, "1.5m" is a decimal. Without one, "150,000" has separators.
    const number = unit ? Number(m[1]!.replace(",", ".")) : Number(m[1]!.replaceAll(/[.,]/g, ""));
    const value = Math.round(number * (unit ? MULTIPLIER[unit]! : 1));
    if (value >= 1_000 && (best === undefined || value > best)) best = value;
  }
  return best;
}

// Keyword spotting only. The real service is expected to do far better,
// especially on Swahili and Sheng.
export function extractProfile(text: string): Extraction {
  const fields: Record<string, unknown> = {};

  for (const [sector, words] of Object.entries(SECTOR_WORDS)) {
    if (words.test(text)) {
      fields.sector = sector;
      break;
    }
  }

  const county = COUNTIES.find((c) => text.toLowerCase().includes(c.toLowerCase()));
  if (county) fields.county = county;

  // Startups only for now (TEAM_DECISIONS D11).
  fields.journey_type = "startup";

  const amount = findAmount(text);
  if (amount) fields.funding_amount_kes = amount;

  return { fields, unsure: missingCoreFields(fields) };
}

// The fields onboarding cannot do without. Whatever an extraction did not
// find is handed back as "unsure" so the form asks for it.
export function missingCoreFields(fields: Record<string, unknown>): string[] {
  const core = ["journey_type", "business_status", "sector", "county", "funding_amount_kes"];
  return core.filter((key) => !(key in fields));
}

// The conditions an item may put on who it applies to. Every condition
// present must hold. A yes/no condition holds only if the founder has
// answered it that way, so nothing is assumed about her business.
function appliesTo(profile: MatchProfile, appliesWhen: unknown): boolean {
  const when = (appliesWhen ?? {}) as Record<string, unknown>;
  const within = (key: string, value: string | null) => {
    const allowed = when[key];
    return !Array.isArray(allowed) || allowed.length === 0 || (value !== null && allowed.includes(value));
  };
  const answered = (key: "has_employees" | "handles_personal_data") =>
    typeof when[key] !== "boolean" || profile[key] === when[key];

  return (
    within("journey_types", profile.journey_type) &&
    within("business_statuses", profile.business_status) &&
    within("counties", profile.county) &&
    within("sectors", profile.sector) &&
    answered("has_employees") &&
    answered("handles_personal_data")
  );
}

export function applicableItems(
  profile: MatchProfile,
  items: ApplicableItem[],
  scope: string,
  dealType: string | null,
): string[] {
  return items
    .filter((i) => i.scope === scope && (scope !== "deal" || i.deal_type === dealType))
    .filter((i) => appliesTo(profile, i.applies_when))
    .map((i) => i.id);
}

const NOT_CONFIRMED =
  "We could not confirm this from our verified sources, so we will not guess. A verified expert can help.";

// Answers only by pointing at a stored item that has an official source
// and is not overdue for review. It never writes a requirement of its own.
export function answerCompliance(question: string, sources: AnswerSource[]): ComplianceAnswer {
  const words = new Set(question.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  const overlap = (s: AnswerSource) =>
    (`${s.id} ${s.title} ${s.institution ?? ""}`.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => words.has(w)).length;

  const best = sources.map((s) => ({ s, hits: overlap(s) })).sort((a, b) => b.hits - a.hits)[0];
  if (!best || best.hits === 0) {
    return { answer: NOT_CONFIRMED, citations: [], confident: false, suggest_expert: true };
  }

  const { s } = best;
  if (!s.source_url || !s.why || s.needs_review) {
    return {
      answer: `This looks like it is about "${s.title}". We have not checked that item against an official source recently enough to answer from it. A verified expert can help.`,
      citations: [],
      confident: false,
      suggest_expert: true,
    };
  }

  return {
    answer: `${s.title}. ${s.why}`,
    citations: [
      { source: s.institution ?? s.title, url: s.source_url, last_verified: s.last_verified_at?.toISOString() ?? null },
    ],
    confident: true,
    suggest_expert: false,
  };
}

const HAS_NUMBER = /(\+?254|0)[17]\d{8}|\b\d{5,7}\b/;

// The scam guard on messages: does this look like a request for money?
// A flag adds a warning for the people receiving the message. It never
// blocks the message, because a real investor may also discuss payments.
export function checkMessage(text: string): ModerationResult {
  const reasons: string[] = [];

  if (/(processing|registration|facilitation|upfront|application|commitment) fees?/i.test(text)) {
    reasons.push("Mentions a fee to be paid");
  }
  if (/send (me |us )?(the |some |your )?money|tuma (pesa|hela)/i.test(text)) {
    reasons.push("Asks for money to be sent");
  }
  // Naming M-Pesa is ordinary. Naming it next to a number to pay is not.
  if (/m-?pesa|paybill|till (number|no)|pochi/i.test(text) && HAS_NUMBER.test(text)) {
    reasons.push("Gives payment details to pay into");
  }

  return { flagged: reasons.length > 0, reasons };
}
