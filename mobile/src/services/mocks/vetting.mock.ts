import type { VettingService } from '../types/api';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export const mockVettingService: VettingService = {
  async getApplication() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    return member?.vetting ?? { approvalStatus: 'draft' };
  },

  async saveDraft(data) {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (!member) throw { code: 'PROFILE_REQUIRED', message: 'Complete onboarding first.' };
    member.vetting = { ...member.vetting, ...data };
    upsertMember(member);
    return member.vetting;
  },

  async submit() {
    await mockDelay(800);
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (!member) throw { code: 'PROFILE_REQUIRED', message: 'Complete onboarding first.' };
    if (!member.user.emailVerified) {
      throw { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before submitting verification.' };
    }
    member.vetting.approvalStatus = 'submitted';
    member.user.approvalStatus = 'submitted';
    upsertMember(member);
    return member.vetting;
  },

  async verifyPhoneSend(phone) {
    await mockDelay();
    void phone;
  },

  async verifyPhoneConfirm(code) {
    await mockDelay();
    if (code !== '123456') throw { code: 'WRONG_CODE', message: 'That code is not right.' };
  },
};
