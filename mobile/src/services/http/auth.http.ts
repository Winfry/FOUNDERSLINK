import type { AuthService } from '../types/api';
import type { AuthTokens, SessionUser } from '../../types';
import { get, post, setToken } from './client';
import { showDemoCode } from './demo-code';

/** `GET /me`, as the backend sends it. Only the fields used here. */
interface Me {
  id: string;
  email: string;
  full_name: string;
  role: SessionUser['role'];
  approval_status: SessionUser['approvalStatus'];
  email_verified_at: string | null;
  phone: string | null;
  preferred_language: string;
  founder_profile: object | null;
  investor_profile: object | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// When the session ends is written inside the token itself.
function tokensFor(token: string): AuthTokens {
  let expiresAt = Date.now() + WEEK_MS;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') expiresAt = payload.exp * 1000;
  } catch {
    /* keep the default */
  }
  return { accessToken: token, expiresAt };
}

export async function fetchSessionUser(): Promise<SessionUser> {
  const me = await get<Me>('/me');
  return {
    id: me.id,
    role: me.role,
    email: me.email,
    fullName: me.full_name,
    phone: me.phone,
    emailVerified: me.email_verified_at !== null,
    approvalStatus: me.approval_status,
    preferredLanguage: me.preferred_language === 'sw' ? 'sw' : 'en',
    // Onboarding is done once she has saved a profile.
    founderOnboardingComplete: me.role !== 'founder' || me.founder_profile !== null,
    investorOnboardingComplete: me.role !== 'investor' || me.investor_profile !== null,
  };
}

async function startSession(token: string) {
  setToken(token);
  return { user: await fetchSessionUser(), tokens: tokensFor(token) };
}

export const httpAuthService: AuthService = {
  async login({ email, password }) {
    const answer = await post<{ token?: string; two_factor_required?: boolean }>('/auth/login', { email, password });
    // Only admins have a second step, and they sign in on the dashboard.
    if (!answer.token) throw { code: 'USE_ADMIN_DASHBOARD', message: 'Admin accounts sign in on the admin dashboard.' };
    return startSession(answer.token);
  },

  async signup(input) {
    if (!input.acceptTerms) throw { code: 'VALIDATION_ERROR', message: 'Accept the Terms and Privacy Policy.' };
    // Sign-up emails her a six-digit code straight away.
    const answer = await post<{ token: string; email_verification?: { dev_code?: string } }>('/auth/register', {
      email: input.email,
      password: input.password,
      full_name: input.fullName,
      role: input.role,
    });
    showDemoCode(answer.email_verification, 'email');
    return startSession(answer.token);
  },

  async verifyEmailOtp(code) {
    await post('/auth/email/verify', { code });
  },

  async resendEmailCode() {
    showDemoCode(await post<{ dev_code?: string }>('/auth/email/code'), 'email');
  },

  async requestPasswordReset(email) {
    await post('/auth/password/forgot', { email });
  },

  async resetPassword(email, code, newPassword) {
    await post('/auth/password/reset', { email, code, new_password: newPassword });
  },

  async logout() {
    // Sessions are tokens: there is nothing to end on the server.
    setToken(null);
  },
};
