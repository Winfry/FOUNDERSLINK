import type { FounderService } from '../types/api';
import type { FounderProfile } from '../../types';
import { readQuestion } from '@shared/expert-question';
import { mockDelay } from './delay';
import { matchesFor } from './demo-investors';
import { KENYAN_COUNTIES } from './kenya-data';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

/**
 * What the demo can tell from her description, in her own words (English,
 * Kiswahili or Sheng): the sector, the county, how much she wants to raise,
 * her stage and a likely business name. Anything it cannot tell is left for
 * her to fill in, so nothing is made up.
 */
export function suggestFromText(text: string): Partial<FounderProfile> {
  const t = text.toLowerCase();
  const out: Partial<FounderProfile> = { description: text.trim().slice(0, 280) };

  const sector = readQuestion(text).sector;
  if (sector) out.sector = sector;

  const county = KENYAN_COUNTIES.map((c) => c.name).find((c) => t.includes(c.toLowerCase()));
  if (county) out.county = county;

  // "KES 2 million", "KSh 2,000,000", "2m", "milioni mbili" -> an amount in KES.
  const words: Record<string, number> = { moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5, kumi: 10 };
  const million = /(\d+(?:\.\d+)?)\s*(?:million|mil\b|m\b)/.exec(t) ?? null;
  const milioni = /milioni\s+(moja|mbili|tatu|nne|tano|kumi)/.exec(t);
  const plain = /(?:kes|ksh)\s*([\d,]{5,})/.exec(t);
  const thousand = /(\d+)\s*(?:k\b|thousand|elfu)/.exec(t);
  const amount = million
    ? Number(million[1]) * 1_000_000
    : milioni
      ? words[milioni[1]!]! * 1_000_000
      : plain
        ? Number(plain[1]!.replace(/,/g, ''))
        : thousand
          ? Number(thousand[1]) * 1000
          : null;
  if (amount && amount >= 10_000) out.fundingAmountKes = Math.round(amount);

  if (/\bidea\b|wazo|planning to start|want to start/.test(t)) out.stage = 'idea';
  else if (/customers|clients|paying|sales|revenue|selling|users|wateja/.test(t)) out.stage = 'early_revenue';
  else if (/\bapp\b|pilot|prototype|launched|we run|we have/.test(t)) out.stage = 'mvp';

  // "We run Shamba Fresh..." or "called Shamba Fresh": a likely name, for her to check.
  const named = /(?:[Cc]alled|[Nn]amed|[Ww]e run|[Oo]ur business is|[Tt]unaitwa)\s+([A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*){0,3})/.exec(text);
  if (named) out.businessName = named[1]!.trim();

  if (/employ|staff|workers|team of|wafanyakazi/.test(t)) out.hasEmployees = true;
  if (sector === 'health' || sector === 'fintech' || /patients|customer data|personal data/.test(t)) out.handlesPersonalData = true;
  return out;
}

export const mockFounderService: FounderService = {
  async getProfile() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    return member?.founderProfile ?? null;
  },

  async extractProfileFromText(text) {
    await mockDelay(800);
    return suggestFromText(text);
  },

  async saveProfile(profile) {
    await mockDelay(500);
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (!member) throw { code: 'PROFILE_REQUIRED', message: 'Sign in to save your profile.' };
    const saved: FounderProfile = {
      ...profile,
      journeyType: 'startup',
      profileCompleteness: Math.min(100, 40 + profile.alreadyHave.length * 8),
    };
    member.founderProfile = saved;
    member.user.founderOnboardingComplete = true;
    // A founder still being checked is matched on her own business, as the
    // real server does. A verified demo founder (Amina) keeps her named list.
    if (member.user.approvalStatus !== 'approved') member.matches = matchesFor(saved);
    upsertMember(member);
    return saved;
  },
};
