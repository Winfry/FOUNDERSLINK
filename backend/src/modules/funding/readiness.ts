// Readiness is decided here, in the backend, with plain lookups. The AI
// decides whether a funder fits; this decides what stands between the
// founder and a funder that fits, and what she should be careful about.

import { kes } from "../../ai/standin.js";
import type { MatchResult, Reason } from "../../ai/types.js";

export interface ReadinessProfile {
  already_have: string[];
  women_owned: boolean | null;
  youth_owned: boolean | null;
  pwd_owned: boolean | null;
}

export interface ReadinessFunder {
  requirements: string[];
  eligibility: string[];
  application_fee_kes: number;
  deadline: Date | null;
  last_verified_at: Date | null;
  is_demo: boolean;
}

export interface ItemInfo {
  title: string;
  source_url: string | null;
  last_verified_at: Date | null;
}

export interface Gap {
  kind: "requirement" | "unanswered";
  // The compliance item id for a requirement, or the profile field to fill in.
  ref: string;
  title: string;
  source_url: string | null;
  last_verified_at: Date | null;
}

export interface RiskFactor {
  code: string;
  text: string;
}

export type Group = "apply_now" | "apply_after" | "not_for_you";

const ELIGIBILITY_LABEL: Record<string, string> = {
  women_owned: "women-owned businesses",
  youth_owned: "youth-owned businesses",
  pwd_owned: "businesses owned by persons with disabilities",
};

export function assessReadiness(
  profile: ReadinessProfile,
  funder: ReadinessFunder,
  items: Map<string, ItemInfo>,
  match: MatchResult,
  now = new Date(),
) {
  const reasons: Reason[] = [...match.reasons];
  const gaps: Gap[] = [];
  let eligible = true;

  for (const flag of funder.eligibility) {
    const label = ELIGIBILITY_LABEL[flag] ?? flag;
    const answer = profile[flag as keyof ReadinessProfile];
    if (answer === true) {
      reasons.push({ signal: "eligibility", fits: true, text: `Is for ${label}, and you said yours is` });
    } else if (answer === false) {
      eligible = false;
      reasons.push({ signal: "eligibility", fits: false, text: `Is only for ${label}` });
    } else {
      gaps.push({
        kind: "unanswered",
        ref: flag,
        title: `This funder is for ${label}. Tell us whether yours is one.`,
        source_url: null,
        last_verified_at: null,
      });
    }
  }

  for (const id of funder.requirements) {
    if (profile.already_have.includes(id)) continue;
    const item = items.get(id);
    gaps.push({
      kind: "requirement",
      ref: id,
      title: item?.title ?? id,
      source_url: item?.source_url ?? null,
      last_verified_at: item?.last_verified_at ?? null,
    });
  }

  // Risk factors inform the founder. They never move a funder between groups.
  const risk_factors: RiskFactor[] = [];
  if (funder.application_fee_kes > 0) {
    risk_factors.push({
      code: "application_fee",
      text: `Charges an application fee of ${kes(funder.application_fee_kes)}. Check with the funder directly before paying anything.`,
    });
  }
  if (funder.deadline && funder.deadline < now) {
    risk_factors.push({ code: "deadline_passed", text: "The application deadline has passed." });
  }
  if (funder.is_demo) {
    risk_factors.push({ code: "demo_data", text: "Demo record. This is not a real funder." });
  } else if (!funder.last_verified_at) {
    risk_factors.push({
      code: "not_verified",
      text: "These details have not been checked against the funder's own source yet.",
    });
  }

  const group: Group =
    match.band === "not_a_fit" || !eligible ? "not_for_you" : gaps.length > 0 ? "apply_after" : "apply_now";

  // Gaps only matter for a funder the founder could actually go to.
  return { group, reasons, gaps: group === "not_for_you" ? [] : gaps, risk_factors };
}
