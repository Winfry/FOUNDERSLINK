import type { MatchBand } from '../../types';
import { del, get, post, put } from './client';
import { syncSessionUser } from './session-sync';

/** A founder as an investor sees her in Discover. */
export interface DiscoverCard {
  /** Null while the investor is not verified: there is nobody to open yet. */
  id: string | null;
  anonymised: boolean;
  /** "Health startup, Nairobi, mvp, seeking KSh 1,000,000": what to show in place of a name. */
  headline: string;
  businessName: string | null;
  founderName: string | null;
  sector: string;
  stage: string | null;
  county: string;
  description: string | null;
  fundingAskKes: number | null;
  band: MatchBand;
  matchReasons: string[];
  /** She already has everything this investor requires. */
  ready: boolean;
}

export interface DiscoverResult {
  /** False until an admin has approved the investor: cards are anonymised. */
  approved: boolean;
  count: number;
  message: string;
  founders: DiscoverCard[];
  /** True when she has not yet said what she funds, so nothing can be matched. */
  needsFund: boolean;
}

/** What the investor funds: her organisation and her mandate. */
export interface InvestorSetup {
  organisationName: string;
  jobTitle?: string;
  bio?: string;
  kind: 'angel' | 'vc' | 'accelerator';
  mandateText: string;
  sectors: string[];
  stages: string[];
  counties: string[];
  instruments: string[];
  ticketMinKes: number;
  ticketMaxKes: number;
}

export interface FounderPublicProfile {
  id: string;
  founderName: string;
  businessName: string | null;
  sector: string | null;
  stage: string | null;
  county: string | null;
  description: string | null;
  fundingAskKes: number | null;
  useOfFunds: string | null;
  yearStarted: number | null;
  website: string | null;
  ventures: { name: string; role: string; years: string | null; outcome: string | null }[];
  /** none | pending | accepted | declined: decides what the button says. */
  connection: { id: string | null; status: string };
}

export interface JoinRequestRow {
  id: string;
  founderId: string;
  founderName: string;
  proposedAmountKes: number;
  pitch: string;
  status: 'pending' | 'accepted' | 'declined';
  declineReason?: string;
  createdAt: string;
}

export interface InvestorService {
  getSetup(): Promise<InvestorSetup | null>;
  saveSetup(setup: InvestorSetup): Promise<void>;
  discover(params?: { search?: string; sector?: string; county?: string; stage?: string }): Promise<DiscoverResult>;
  getFounderPublicProfile(id: string): Promise<FounderPublicProfile>;
  submitJoinRequest(founderId: string, payload: { pitch: string; vision?: string; offer?: string; amountKes?: number }): Promise<{ id: string }>;
  getJoinRequests(): Promise<JoinRequestRow[]>;
  withdrawJoinRequest(id: string): Promise<void>;
}

interface ApiFounder {
  anonymised: boolean;
  headline?: string;
  user_id?: string;
  full_name?: string;
  business_name?: string | null;
  sector: string;
  stage: string | null;
  county: string;
  description?: string;
  funding_amount_kes: number | null;
  band: MatchBand;
  match_reasons?: string[];
  ready: boolean;
}

interface ApiMe {
  approval_status: 'draft' | 'submitted' | 'in_review' | 'needs_info' | 'approved' | 'rejected' | 'suspended' | 'banned';
  investor_profile: { organisation_name: string; job_title: string | null; bio: string | null } | null;
  funder: {
    kind: InvestorSetup['kind'];
    mandate_text: string;
    sectors: string[];
    stages: string[];
    counties: string[];
    instruments: string[];
    ticket_min_kes: number;
    ticket_max_kes: number;
  } | null;
}

const words = (id: string | null) => (id ? id.replace(/_/g, ' ') : '');

export const httpInvestorService: InvestorService = {
  async getSetup() {
    const me = await get<ApiMe>('/me');
    await syncSessionUser({ approvalStatus: me.approval_status });
    if (!me.investor_profile || !me.funder) return null;
    return {
      organisationName: me.investor_profile.organisation_name,
      jobTitle: me.investor_profile.job_title ?? undefined,
      bio: me.investor_profile.bio ?? undefined,
      kind: me.funder.kind,
      mandateText: me.funder.mandate_text,
      sectors: me.funder.sectors,
      stages: me.funder.stages,
      counties: me.funder.counties,
      instruments: me.funder.instruments,
      ticketMinKes: me.funder.ticket_min_kes,
      ticketMaxKes: me.funder.ticket_max_kes,
    };
  },

  // Two things are saved: who she invests for, and what she funds. The
  // second is the record founders are matched against.
  async saveSetup(setup) {
    await put('/me/investor-profile', {
      organisation_name: setup.organisationName,
      job_title: setup.jobTitle || undefined,
      bio: setup.bio || undefined,
    });
    await put('/me/funder', {
      name: setup.organisationName,
      kind: setup.kind,
      mandate_text: setup.mandateText,
      journey_types: ['startup'],
      sectors: setup.sectors,
      stages: setup.stages,
      counties: setup.counties,
      instruments: setup.instruments,
      ticket_min_kes: setup.ticketMinKes,
      ticket_max_kes: setup.ticketMaxKes,
    });
  },

  async discover(params = {}) {
    const query = Object.entries(params)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    let answer: { approved: boolean; count: number; message: string; founders: ApiFounder[] };
    try {
      answer = await get(`/investor/matches${query ? `?${query}` : ''}`);
    } catch (e) {
      // She has not said what she funds yet, so there is nothing to match against.
      if ((e as { code?: string }).code === 'FUNDER_REQUIRED') {
        return { approved: false, count: 0, message: '', founders: [], needsFund: true };
      }
      throw e;
    }
    await syncSessionUser({ approvalStatus: answer.approved ? 'approved' : undefined });
    return {
      approved: answer.approved,
      count: answer.count,
      message: answer.message,
      needsFund: false,
      founders: answer.founders.map((f) => ({
        id: f.user_id ?? null,
        anonymised: f.anonymised,
        headline: f.headline ?? `${words(f.sector)} startup, ${f.county}`,
        businessName: f.business_name ?? null,
        founderName: f.full_name ?? null,
        sector: f.sector,
        stage: f.stage,
        county: f.county,
        description: f.description ?? null,
        fundingAskKes: f.funding_amount_kes,
        band: f.band,
        matchReasons: f.match_reasons ?? [],
        ready: f.ready,
      })),
    };
  },

  async getFounderPublicProfile(id) {
    const p = await get<{
      id: string;
      full_name: string;
      connection: { id: string | null; status: string };
      founder: {
        business_name: string | null;
        sector: string;
        stage: string | null;
        county: string;
        description: string;
        funding_amount_kes: number | null;
        use_of_funds: string | null;
        year_started: number | null;
        website: string | null;
      } | null;
      track_record?: { venture_name: string; role: string; years: string | null; outcome: string | null }[];
    }>(`/profiles/${id}`);
    return {
      id: p.id,
      founderName: p.full_name,
      businessName: p.founder?.business_name ?? null,
      sector: p.founder?.sector ?? null,
      stage: p.founder?.stage ?? null,
      county: p.founder?.county ?? null,
      description: p.founder?.description ?? null,
      fundingAskKes: p.founder?.funding_amount_kes ?? null,
      useOfFunds: p.founder?.use_of_funds ?? null,
      yearStarted: p.founder?.year_started ?? null,
      website: p.founder?.website ?? null,
      ventures: (p.track_record ?? []).map((v) => ({ name: v.venture_name, role: v.role, years: v.years, outcome: v.outcome })),
      connection: p.connection,
    };
  },

  // A join request is a connection request that carries her pitch and
  // the amount she proposes. Accepting it connects the two; the founder
  // is then offered a deal with that amount filled in.
  async submitJoinRequest(founderId, payload) {
    return post<{ id: string }>('/connections', {
      user_id: founderId,
      pitch: payload.pitch || undefined,
      vision: payload.vision || undefined,
      offer: payload.offer || undefined,
      proposed_amount_kes: payload.amountKes || undefined,
    });
  },

  async getJoinRequests() {
    const rows = await get<
      {
        id: string;
        status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
        direction: 'sent' | 'received';
        with: { id: string; full_name: string };
        pitch: string | null;
        message: string | null;
        proposed_amount_kes: number | null;
        decline_reason: string | null;
        created_at: string;
      }[]
    >('/connections');
    return rows
      .filter((c) => c.direction === 'sent' && c.status !== 'withdrawn')
      .map((c) => ({
        id: c.id,
        founderId: c.with.id,
        founderName: c.with.full_name,
        proposedAmountKes: c.proposed_amount_kes ?? 0,
        pitch: c.pitch ?? c.message ?? '',
        status: c.status as JoinRequestRow['status'],
        declineReason: c.decline_reason ?? undefined,
        createdAt: c.created_at,
      }));
  },

  async withdrawJoinRequest(id) {
    await del(`/connections/${id}`);
  },
};
