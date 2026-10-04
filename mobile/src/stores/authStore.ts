import * as SecureStore from '../lib/secure-storage';
import { create } from 'zustand';
import type { AuthTokens, SessionUser, SignupInput } from '../types';
import { authService } from '../services';
import { setMockSessionUserId } from '../services/mocks/mock-session';

const SESSION_KEY = 'founderlink_session_v2';

interface StoredSession {
  user: SessionUser;
  tokens: AuthTokens;
}

interface AuthState {
  user: SessionUser | null;
  tokens: AuthTokens | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: StoredSession) => Promise<void>;
  patchUser: (patch: Partial<SessionUser>) => Promise<void>;
  markFounderOnboardingComplete: () => Promise<void>;
  markInvestorOnboardingComplete: () => Promise<void>;
  markEmailVerified: () => Promise<void>;
  checkTokenExpiry: () => Promise<boolean>;
}

async function persistSession(session: StoredSession | null) {
  if (session) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  hydrated: false,

  async hydrate() {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSession;
        if (parsed.tokens.expiresAt < Date.now()) {
          await persistSession(null);
          setMockSessionUserId(null);
          set({ user: null, tokens: null, hydrated: true });
          return;
        }
        setMockSessionUserId(parsed.user.id);
        set({ user: parsed.user, tokens: parsed.tokens, hydrated: true });
        return;
      }
    } catch {
      /* ignore corrupt session */
    }
    setMockSessionUserId(null);
    set({ hydrated: true });
  },

  async setSession(session) {
    setMockSessionUserId(session.user.id);
    await persistSession(session);
    set({ user: session.user, tokens: session.tokens });
  },

  async login(email, password) {
    const { user, tokens } = await authService.login({ email, password });
    await get().setSession({ user, tokens });
  },

  async signup(input) {
    const { user, tokens } = await authService.signup(input);
    await get().setSession({ user, tokens });
  },

  async logout() {
    await authService.logout();
    await persistSession(null);
    setMockSessionUserId(null);
    set({ user: null, tokens: null });
  },

  async patchUser(patch) {
    const { user, tokens } = get();
    if (!user || !tokens) return;
    const updated = { ...user, ...patch };
    await get().setSession({ user: updated, tokens });
  },

  async markFounderOnboardingComplete() {
    await get().patchUser({ founderOnboardingComplete: true });
  },

  async markInvestorOnboardingComplete() {
    await get().patchUser({ investorOnboardingComplete: true });
  },

  async markEmailVerified() {
    await get().patchUser({ emailVerified: true });
  },

  async checkTokenExpiry() {
    const { tokens, logout } = get();
    if (tokens && tokens.expiresAt < Date.now()) {
      await logout();
      return true;
    }
    return false;
  },
}));
