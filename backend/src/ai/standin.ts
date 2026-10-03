// Rule-based stand-in for the AI service. It keeps the funding flow
// working before the real service is reachable, and takes over if a call
// to it fails. It is plain rules, not AI, and responses say so through
// the `engine` field.

import { COUNTIES } from "../shared/constants.js";
import type { Band, Extraction, MatchFunder, MatchProfile, MatchResult, Reason } from "./types.js";

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

const SECTOR_WORDS: Record<string, RegExp> = {
  health: /\b(clinic|hospital|health|afya|dawa|pharmacy|chemist)/i,
  agri: /\b(farm|shamba|agri|kilimo|mifugo|dairy|poultry|kuku)/i,
  fintech: /\b(fintech|payments?|mobile money|lending)/i,
  climate: /\b(climate|solar|recycl|clean energy|waste)/i,
  retail: /\b(shop|duka|salon|kinyozi|boutique|mitumba|kiosk|retail)/i,
  education: /\b(school|tutor|edtech|elimu|learning)/i,
  logistics: /\b(delivery|logistics|boda|transport|courier)/i,
};

const STARTUP_WORDS = /\b(app|platform|software|startup|saas)\b/i;
const SME_WORDS = /\b(salon|duka|shop|kiosk|shamba|farm|kinyozi|mitumba|boutique)\b/i;

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

  if (STARTUP_WORDS.test(text)) fields.journey_type = "startup";
  else if (SME_WORDS.test(text)) fields.journey_type = "sme";

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
