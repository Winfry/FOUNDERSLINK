import type { AuthService, LoginCredentials, FounderSignupInput } from '../types/api';
import { normalizeEmail, resolveLogin } from '../../lib/application-store';
import { mockDelay } from './delay';

const DEMO_FOUNDER = {
  id: 'u-founder-1',
  role: 'founder' as const,
  email: 'wanjiku@maziwafresh.co.ke',
  fullName: 'Wanjiku Mwangi',
  phone: '+254712345678',
  userId: 'FL-FND-10001',
  founderOnboardingComplete: true,
};

const DEMO_INVESTOR = {
  id: 'u-investor-1',
  role: 'investor' as const,
  email: 'james.kariuki@example.com',
  fullName: 'James Kariuki',
  userId: 'FL-INV-20481',
  mustChangePassword: false,
  investorOnboardingComplete: true,
};

function tokensFor(userId: string) {
  return {
    accessToken: `mock-access-${userId}`,
    refreshToken: `mock-refresh-${userId}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

export const mockAuthService: AuthService = {
  async login({ identifier, password }: LoginCredentials) {
    await mockDelay();
    const id = identifier.toLowerCase().trim();
    if (password.length < 6) {
      throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email, User ID, or password.' };
    }

    const fromStore = resolveLogin(identifier, password);
    if (fromStore) {
      return {
        user: {
          id: `u-${fromStore.role}-${fromStore.userId}`,
          role: fromStore.role,
          email: fromStore.email,
          fullName: fromStore.fullName,
          userId: fromStore.userId,
          mustChangePassword: fromStore.mustChangePassword,
          founderOnboardingComplete: fromStore.role === 'founder' ? false : undefined,
          investorOnboardingComplete: fromStore.role === 'investor' ? false : undefined,
        },
        tokens: tokensFor(fromStore.userId),
      };
    }

    if (id === 'fl-inv-20481' || (id.includes('investor') && !id.includes('@'))) {
      const mustChange = password === 'TempPass2026!';
      return {
        user: { ...DEMO_INVESTOR, mustChangePassword: mustChange },
        tokens: tokensFor(DEMO_INVESTOR.id),
      };
    }
    if (id.includes('founder') || id === demoEmail(DEMO_FOUNDER.email)) {
      if (password === 'TempPass2026!') {
        return {
          user: { ...DEMO_FOUNDER, mustChangePassword: true, founderOnboardingComplete: false },
          tokens: tokensFor(DEMO_FOUNDER.userId),
        };
      }
      return { user: DEMO_FOUNDER, tokens: tokensFor(DEMO_FOUNDER.id) };
    }
    if (id.includes('@')) {
      return { user: DEMO_FOUNDER, tokens: tokensFor(DEMO_FOUNDER.id) };
    }
    throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email, User ID, or password.' };
  },

  async signupFounder(input: FounderSignupInput) {
    await mockDelay(600);
    throw {
      code: 'USE_APPLICATION',
      message: 'Founders must apply via the founder application. Approval is required before login.',
    };
  },

  async verifyEmailOtp(_email, otp) {
    await mockDelay();
    if (otp !== '123456') throw { code: 'OTP', message: 'Invalid verification code.' };
  },

  async requestPasswordReset() {
    await mockDelay();
  },

  async verifyResetOtp() {
    await mockDelay();
  },

  async resetPassword() {
    await mockDelay();
  },

  async setNewPassword(_userId, tempPassword, newPassword) {
    await mockDelay();
    if (newPassword === tempPassword) {
      throw { code: 'PASSWORD_REUSE', message: 'Cannot reuse your temporary password.' };
    }
    if (newPassword.length < 8) {
      throw { code: 'WEAK_PASSWORD', message: 'Password does not meet requirements.' };
    }
  },

  async refreshSession(refreshToken) {
    await mockDelay(200);
    return {
      user: DEMO_FOUNDER,
      tokens: {
        accessToken: refreshToken.replace('refresh', 'access'),
        refreshToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
    };
  },

  async logout() {
    await mockDelay(100);
  },
};

function demoEmail(email: string) {
  return normalizeEmail(email);
}
