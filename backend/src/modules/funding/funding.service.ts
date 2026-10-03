import { matchFunders } from "../../ai/client.js";
import type { MatchFunder, MatchProfile } from "../../ai/types.js";
import { prisma } from "../../shared/db.js";
import { conflict } from "../../shared/errors.js";
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

export function listFunders() {
  return prisma.funder.findMany({ select: funderFields, orderBy: { name: "asc" } });
}

export function listComplianceItems() {
  return prisma.complianceItem.findMany({ orderBy: { title: "asc" } });
}

export async function getMatches(userId: string) {
  const profile = await prisma.founderProfile.findUnique({ where: { user_id: userId } });
  if (!profile) throw conflict("PROFILE_REQUIRED", "Finish onboarding to see your funding matches");

  const [funders, itemRows] = await Promise.all([listFunders(), listComplianceItems()]);
  const items = new Map(itemRows.map((i) => [i.id, i]));

  // Only business fields go to the AI: picked one by one, so nothing
  // personal and no eligibility flag can slip in.
  const matchProfile: MatchProfile = {
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
  };
  const matchFunderRows: MatchFunder[] = funders.map((f) => ({
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
  }));

  const { results, engine } = await matchFunders(matchProfile, matchFunderRows);
  const byFunder = new Map(results.map((r) => [r.funder_id, r]));

  const cards = funders.map((funder) => {
    const match = byFunder.get(funder.id)!;
    const readiness = assessReadiness(profile, funder, items, match);
    return { funder, score: match.score, ...readiness };
  });

  const inGroup = (group: Group) =>
    cards
      .filter((c) => c.group === group)
      // Fewest gaps first, then best score.
      .sort((a, b) => a.gaps.length - b.gaps.length || b.score - a.score)
      .map(({ group: _group, ...card }) => card);

  return {
    engine,
    journey_type: profile.journey_type,
    apply_now: inGroup("apply_now"),
    apply_after: inGroup("apply_after"),
    not_for_you: inGroup("not_for_you"),
    disclaimer:
      "These are suggestions based on what you told us and on published funder information. They are not a guarantee of funding.",
  };
}
