import type { VettingService } from '../types/api';
import { mockDelay } from './delay';
import { DEMO_CODE } from './demo-code';
import { showDemoCode } from '../http/demo-code';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export const mockVettingService: VettingService = {
  async getApplication() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    const vetting = member?.vetting ?? { approvalStatus: 'draft' as const };
    return { ...vetting, emailVerified: member?.user.emailVerified ?? false };
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
    // Demo data sends no SMS, so the code is shown, as the backend's demo does.
    showDemoCode({ dev_code: DEMO_CODE }, 'SMS');
  },

  async verifyPhoneConfirm(code) {
    await mockDelay();
    if (code !== DEMO_CODE) throw { code: 'WRONG_CODE', message: 'That code is not right.' };
  },
};
