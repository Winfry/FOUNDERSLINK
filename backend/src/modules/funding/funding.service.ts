import { matchFunders } from "../../ai/client.js";
import type { MatchFunder, MatchProfile } from "../../ai/types.js";
import type { FounderProfile } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/db.js";
import { conflict } from "../../shared/errors.js";
import { completedFor } from "../compliance/status.js";
import { assessReadiness, type Group } from "./readiness.js";

const funderFields = {
  id: true,
  name: true,
  kind: true,
  mandate_text: true,
  journey_types: true,
  sectors: true,
  stages: true,
  counties: true,
  instruments: true,
  ticket_min_kes: true,
  ticket_max_kes: true,
  requirements: true,
  eligibility: true,
  application_fee_kes: true,
  deadline: true,
  how_to_apply_url: true,
  source_url: true,
  last_verified_at: true,
  is_demo: true,
} as const;

// A record an investor maintains is shown to founders only once that
// investor has been approved. Records built from public information are
// always shown.
const visibleToFounders = {
  OR: [{ claimed_by_user_id: null }, { claimed_by: { approval_status: "approved" as const } }],
};

export function listFunders() {
  return prisma.funder.findMany({ where: visibleToFounders, select: funderFields, orderBy: { name: "asc" } });
}

export function listComplianceItems() {
  return prisma.complianceItem.findMany({ orderBy: { title: "asc" } });
}

// Only business fields go to the AI: picked one by one, so nothing
// personal and no eligibility flag can slip in.
export function toMatchProfile(profile: FounderProfile): MatchProfile {
  return {
    journey_type: profile.journey_type,
    business_status: profile.business_status,
    description: profile.description,
    sector: profile.sector,
    county: profile.county,
    funding_amount_kes: profile.funding_amount_kes,
    use_of_funds: profile.use_of_funds,
    stage: profile.stage,
    instruments: profile.instruments,
    months_trading: profile.months_trading,
    monthly_revenue_band: profile.monthly_revenue_band,
    has_employees: profile.has_employees,
    handles_personal_data: profile.handles_personal_data,
  };
}

export function toMatchFunder(f: MatchFunder): MatchFunder {
  return {
    id: f.id,
    kind: f.kind,
    mandate_text: f.mandate_text,
    journey_types: f.journey_types,
    sectors: f.sectors,
    stages: f.stages,
    counties: f.counties,
    instruments: f.instruments,
    ticket_min_kes: f.ticket_min_kes,
    ticket_max_kes: f.ticket_max_kes,
  };
}

export async function getMatches(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { approval_status: true, founder_profile: true },
  });
  const profile = user?.founder_profile;
  if (!profile) throw conflict("PROFILE_REQUIRED", "Finish onboarding to see your funding matches");
  const approved = user.approval_status === "approved";

  const [already_have, funders, itemRows] = await Promise.all([
    completedFor(userId),
    prisma.funder.findMany({
      where: visibleToFounders,
      select: {
        ...funderFields,
        claimed_by: {
          select: {
            id: true,
            full_name: true,
            investor_profile: { select: { organisation_name: true, job_title: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    listComplianceItems(),
  ]);
  const items = new Map(itemRows.map((i) => [i.id, i]));

  const { results, engine } = await matchFunders(toMatchProfile(profile), funders.map(toMatchFunder));
  const byFunder = new Map(results.map((r) => [r.funder_id, r]));

  const cards = funders.map(({ claimed_by, ...funder }) => {
    const match = byFunder.get(funder.id)!;
    const readiness = assessReadiness({ ...profile, already_have }, funder, items, match);
    const ruledOut = readiness.group === "not_for_you";
    return {
      funder,
      source: claimed_by ? ("maintained_by_funder" as const) : ("public_information" as const),
      // The person behind a record is another member, so she is shown
      // only to an approved founder. Until then the card says someone is there.
      investor:
        claimed_by && approved
          ? {
              user_id: claimed_by.id,
              full_name: claimed_by.full_name,
              organisation_name: claimed_by.investor_profile?.organisation_name ?? null,
              job_title: claimed_by.investor_profile?.job_title ?? null,
            }
          : null,
      investor_locked: Boolean(claimed_by) && !approved,
      score: match.score,
      // A band says how well a funder fits, so a funder that is ruled out has none.
      band: ruledOut ? null : match.band,
      explanation: ruledOut
        ? `${readiness.reasons.filter((r) => !r.fits).map((r) => r.text).join(". ")}.`
        : match.explanation,
      ...readiness,
    };
  });

  const inGroup = (group: Group) =>
    cards
      .filter((c) => c.group === group)
      // Fewest gaps first, then best score.
      .sort((a, b) => a.gaps.length - b.gaps.length || b.score - a.score)
      // The score is for sorting only: founders see the band.
      .map(({ group: _group, score: _score, ...card }) => card);

  const lockedInvestors = cards.filter((c) => c.investor_locked && c.group !== "not_for_you").length;

  return {
    engine,
    journey_type: profile.journey_type,
    approval_status: user.approval_status,
    // For a founder who is not approved yet: how many of her matches
    // have an investor she could reach once she is.
    locked:
      lockedInvestors > 0
        ? {
            investors: lockedInvestors,
            message: `${lockedInvestors} of your matches ${lockedInvestors === 1 ? "has an investor" : "have investors"} on FounderLink. Get approved to see who they are.`,
          }
        : null,
    apply_now: inGroup("apply_now"),
    apply_after: inGroup("apply_after"),
    not_for_you: inGroup("not_for_you"),
    disclaimer:
      "These are suggestions based on what you told us and on published funder information. They are not a guarantee of funding.",
  };
}
