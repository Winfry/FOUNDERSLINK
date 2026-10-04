import type { FundingService } from '../types/api';
import type { ApprovalStatus, FundingMatches, InvestorMatchCard, MatchBand, MatchReason } from '../../types';
import { get } from './client';
import { syncSessionUser } from './session-sync';

/** One card of `GET /funding/matches`. Only the fields used here. */
interface ApiCard {
  funder: {
    id: string;
    name: string | null;
    mandate_text: string | null;
    sectors: string[];
    stages: string[];
    ticket_min_kes: number | null;
    ticket_max_kes: number | null;
  };
  anonymised: boolean;
  headline: string;
  investor: { user_id: string; full_name: string; organisation_name: string | null } | null;
  band: MatchBand | null;
  explanation: string;
  reasons: MatchReason[];
  gaps: { kind: 'requirement' | 'unanswered'; ref: string; title: string }[];
  risk_factors: { code: string; text: string }[];
}

interface ApiMatches {
  approval_status: ApprovalStatus;
  apply_now: ApiCard[];
  apply_after: ApiCard[];
  not_for_you: ApiCard[];
}

// A match is a funder record. Some have a person behind them and some
// are built from public information, so a card is known by the record's
// id, which is always there. Below level 2 a member's record has no
// name, and its headline ("Angel investor · health · KSh …") stands in.
// A demo record's name ends in "(demo)". The card says it is a demo
// record in its own note, so the name is shown without the suffix.
const nameOf = (card: ApiCard) => (card.funder.name ?? card.headline).replace(/\s*\(demo\)$/i, '');

function toCard(card: ApiCard): InvestorMatchCard {
  return {
    investorUserId: card.funder.id,
    displayName: nameOf(card),
    band: card.band ?? 'not_a_fit',
    reasons: card.reasons,
    gaps: card.gaps.map((gap) => ({
      kind: gap.kind,
      text: gap.title,
      complianceItemId: gap.kind === 'requirement' ? gap.ref : undefined,
    })),
    riskFactors: card.risk_factors.map((risk) => ({ text: risk.text })),
    organisationName: card.investor?.organisation_name ?? undefined,
    anonymised: card.anonymised,
  };
}

const SOURCE_TEXT = (entry: { company_name: string | null; sector: string; stage: string | null; year: number | null }) =>
  [entry.company_name ?? `A ${entry.sector} business`, entry.stage?.replace(/_/g, ' '), entry.year].filter(Boolean).join(', ');

export const httpFundingService: FundingService = {
  async getMatches(): Promise<FundingMatches> {
    const matches = await get<ApiMatches>('/funding/matches');
    // The matches screen is where she lands, so this is also where the
    // app learns that an admin has approved her.
    await syncSessionUser({ approvalStatus: matches.approval_status });
    return {
      applyNow: matches.apply_now.map(toCard),
      applyAfter: matches.apply_after.map(toCard),
      notForYou: matches.not_for_you.map(toCard),
    };
  },

  // `investorUserId` is the id of the match card (the funder record).
  async getInvestorProfile(investorUserId) {
    const matches = await get<ApiMatches>('/funding/matches');
    const card = [...matches.apply_now, ...matches.apply_after, ...matches.not_for_you].find((c) => c.funder.id === investorUserId);
    if (!card) throw { code: 'NOT_FOUND', message: 'This match is no longer available.' };

    // The person behind the record, and her track record, are shown
    // only to a verified founder. The backend decides; we just ask.
    let trackRecord: { label: string; source: string }[] = [];
    if (card.investor) {
      const profile = await get<{
        track_record?: { company_name: string | null; sector: string; stage: string | null; year: number | null; source: string }[];
      }>(`/profiles/${card.investor.user_id}`).catch(() => null);
      trackRecord = (profile?.track_record ?? []).map((entry) => ({ label: SOURCE_TEXT(entry), source: entry.source }));
    }

    return {
      investorUserId,
      // Who to send a connection request to, when there is a person.
      connectUserId: card.investor?.user_id ?? null,
      displayName: nameOf(card),
      anonymised: card.anonymised,
      band: card.band,
      explanation: card.explanation,
      reasons: card.reasons,
      whatTheyFund: card.funder.mandate_text ?? card.headline,
      sectors: card.funder.sectors,
      stages: card.funder.stages,
      ticketMinKes: card.funder.ticket_min_kes,
      ticketMaxKes: card.funder.ticket_max_kes,
      gaps: card.gaps,
      riskFactors: card.risk_factors,
      trackRecord,
    };
  },
};
