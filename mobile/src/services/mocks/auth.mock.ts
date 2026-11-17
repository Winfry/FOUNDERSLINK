import type { AuthService } from '../types/api';
import type { SessionUser, SignupInput } from '../../types';
import { mockDelay } from './delay';
import { DEMO_CODE } from './demo-code';
import { showDemoCode } from '../http/demo-code';
import { getMemberByEmail, getMemberById, upsertMember, type MockMemberState, anonymisedMatches } from './mock-store';
import { getMockSessionUserId } from './mock-session';

function tokensFor(userId: string) {
  return {
    accessToken: `mock-${userId}`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
}

function sessionFrom(state: MockMemberState): SessionUser {
  return { ...state.user };
}

let pendingEmailCodeFor: string | null = null;

export const mockAuthService: AuthService = {
  async login({ email, password }) {
    await mockDelay();
    const member = getMemberByEmail(email);
    if (!member || password.length < 8 || member.password !== password) {
      throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }
    return { user: sessionFrom(member), tokens: tokensFor(member.user.id) };
  },

  async signup(input: SignupInput) {
    await mockDelay(600);
    if (!input.acceptTerms) {
      throw { code: 'VALIDATION_ERROR', message: 'Accept the Terms and Privacy Policy.' };
    }
    if (getMemberByEmail(input.email)) {
      throw { code: 'EMAIL_IN_USE', message: 'An account already exists for this email.' };
    }
    const user: SessionUser = {
      id: `u-${Date.now()}`,
      role: input.role,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName,
      emailVerified: false,
      approvalStatus: 'draft',
      preferredLanguage: 'en',
      // Each new member sets up her own side first: a founder her business,
      // an investor what she funds, an expert what she does.
      founderOnboardingComplete: input.role !== 'founder',
      investorOnboardingComplete: input.role !== 'investor',
      expertOnboardingComplete: input.role !== 'expert',
    };
    const state: MockMemberState = {
      user,
      password: input.password,
      founderProfile: null,
      consents: { profile_visibility: false, ai_matching: false, contact: false },
      vetting: { approvalStatus: 'draft' },
      // A new founder is matched like any founder not yet verified: what each
      // investor funds, without names (once she turns matching on).
      matches: input.role === 'founder' ? anonymisedMatches : { applyNow: [], applyAfter: [], notForYou: [] },
      deals: [],
    };
    upsertMember(state);
    pendingEmailCodeFor = user.email;
    // Demo data sends no email, so the code is shown, as the backend's demo does.
    showDemoCode({ dev_code: DEMO_CODE }, 'email');
    return { user, tokens: tokensFor(user.id) };
  },

  async verifyEmailOtp(code) {
    await mockDelay();
    if (code !== DEMO_CODE) throw { code: 'WRONG_CODE', message: 'That code is not right.' };
    // Recorded on the member, as the backend does, so verification can be submitted.
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (member) {
      member.user.emailVerified = true;
      upsertMember(member);
    }
    pendingEmailCodeFor = null;
  },

  async resendEmailCode() {
    await mockDelay(300);
    showDemoCode({ dev_code: DEMO_CODE }, 'email');
  },

  async requestPasswordReset(email) {
    await mockDelay();
    void email;
    showDemoCode({ dev_code: DEMO_CODE }, 'email');
  },

  async resetPassword(email, code, newPassword) {
    await mockDelay();
    if (code !== DEMO_CODE) throw { code: 'WRONG_CODE', message: 'That code is not right.' };
    const member = getMemberByEmail(email);
    if (!member) throw { code: 'NOT_FOUND', message: 'No account for this email.' };
    member.password = newPassword;
    upsertMember(member);
  },

  async logout() {
    await mockDelay(100);
  },
};
