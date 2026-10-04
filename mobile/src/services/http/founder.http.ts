import type { FounderService } from '../types/api';
import type { ApprovalStatus, FounderProfile } from '../../types';
import { get, post, put } from './client';
import { syncSessionUser } from './session-sync';

/** A founder profile as the backend sends it. */
interface ApiProfile {
  business_name: string | null;
  sector: string;
  stage: FounderProfile['stage'] | null;
  county: string;
  description: string;
  funding_amount_kes: number | null;
  business_status: FounderProfile['businessStatus'];
  instruments: FounderProfile['instruments'];
  has_employees: boolean | null;
  handles_personal_data: boolean | null;
  already_have: string[];
  profile_completeness: number;
  year_started: number | null;
  website: string | null;
}

function toProfile(p: ApiProfile): FounderProfile {
  return {
    businessName: p.business_name ?? '',
    sector: p.sector,
    stage: p.stage ?? 'idea',
    county: p.county,
    description: p.description,
    fundingAmountKes: p.funding_amount_kes ?? 0,
    journeyType: 'startup',
    businessStatus: p.business_status,
    instruments: p.instruments,
    hasEmployees: p.has_employees ?? false,
    handlesPersonalData: p.handles_personal_data ?? false,
    alreadyHave: p.already_have ?? [],
    profileCompleteness: p.profile_completeness ?? 0,
    yearStarted: p.year_started ?? undefined,
    website: p.website ?? undefined,
  };
}

// The backend's field names, and the app's name for each.
const FIELDS: Record<string, keyof FounderProfile> = {
  business_name: 'businessName',
  sector: 'sector',
  stage: 'stage',
  county: 'county',
  funding_amount_kes: 'fundingAmountKes',
  business_status: 'businessStatus',
  instruments: 'instruments',
  has_employees: 'hasEmployees',
  handles_personal_data: 'handlesPersonalData',
  year_started: 'yearStarted',
};

export const httpFounderService: FounderService = {
  async getProfile() {
    const me = await get<{ founder_profile: ApiProfile | null; approval_status?: ApprovalStatus }>('/me');
    // Her profile screen shows whether she is verified, so it must be current.
    if (me.approval_status) await syncSessionUser({ approvalStatus: me.approval_status });
    return me.founder_profile ? toProfile(me.founder_profile) : null;
  },

  // Suggestions only: she confirms every field on the next step.
  async extractProfileFromText(text, language) {
    const answer = await post<{ fields: Record<string, unknown> }>('/me/profile/extract', { text, language });
    const suggested: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(answer.fields)) {
      const name = FIELDS[field];
      if (name && value !== null && value !== undefined) suggested[name] = value;
    }
    return suggested as Partial<FounderProfile>;
  },

  async saveProfile(profile) {
    const saved = await put<ApiProfile>('/me/profile', {
      journey_type: 'startup',
      business_name: profile.businessName?.trim() || undefined,
      sector: profile.sector,
      stage: profile.stage,
      county: profile.county,
      description: profile.description,
      funding_amount_kes: profile.fundingAmountKes || undefined,
      business_status: profile.businessStatus,
      instruments: profile.instruments ?? [],
      has_employees: profile.hasEmployees,
      handles_personal_data: profile.handlesPersonalData,
      already_have: profile.alreadyHave ?? [],
      year_started: profile.yearStarted,
      website: profile.website || undefined,
    });
    return toProfile(saved);
  },
};
