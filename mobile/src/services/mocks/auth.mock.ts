import type { AuthService } from '../types/api';
import type { SessionUser, SignupInput } from '../../types';
import { mockDelay } from './delay';
import { getMemberByEmail, upsertMember, type MockMemberState } from './mock-store';

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
      founderOnboardingComplete: false,
      investorOnboardingComplete: input.role !== 'founder',
    };
    const state: MockMemberState = {
      user,
      password: input.password,
      founderProfile: null,
      consents: { profile_visibility: false, ai_matching: false, contact: false },
      vetting: { approvalStatus: 'draft' },
      matches: {
        applyNow: [],
        applyAfter: [],
        notForYou: [],
      },
      deals: [],
    };
    upsertMember(state);
    pendingEmailCodeFor = user.email;
    return { user, tokens: tokensFor(user.id) };
  },

  async verifyEmailOtp(code) {
    await mockDelay();
    if (code !== '123456') throw { code: 'WRONG_CODE', message: 'That code is not right.' };
    pendingEmailCodeFor = null;
  },

  async resendEmailCode() {
    await mockDelay(300);
  },

  async requestPasswordReset(email) {
    await mockDelay();
    void email;
  },

  async resetPassword(email, code, newPassword) {
    await mockDelay();
    if (code !== '123456') throw { code: 'WRONG_CODE', message: 'That code is not right.' };
    const member = getMemberByEmail(email);
    if (!member) throw { code: 'NOT_FOUND', message: 'No account for this email.' };
    member.password = newPassword;
    upsertMember(member);
  },

  async logout() {
    await mockDelay(100);
  },
};
