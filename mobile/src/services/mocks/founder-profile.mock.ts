import type { FounderService } from '../types/api';
import type { FounderProfile } from '../../types';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export const mockFounderService: FounderService = {
  async getProfile() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    return member?.founderProfile ?? null;
  },

  async extractProfileFromText(text) {
    await mockDelay(800);
    void text;
    return {
      businessName: 'ClinicBook Health',
      sector: 'health',
      stage: 'mvp',
      county: 'Nairobi',
      description: text.slice(0, 280),
      fundingAmountKes: 1_000_000,
      businessStatus: 'registered_business_name',
      instruments: ['equity', 'convertible_note'],
      hasEmployees: true,
      handlesPersonalData: true,
    };
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
    upsertMember(member);
    return saved;
  },
};
