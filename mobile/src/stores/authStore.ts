import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthTokens, SessionUser } from '../types';
import { authService } from '../services';

const SESSION_KEY = 'founderlink_session';

interface StoredSession {
  user: SessionUser;
  tokens: AuthTokens;
}

interface AuthState {
  user: SessionUser | null;
  tokens: AuthTokens | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: StoredSession) => Promise<void>;
  clearMustChangePassword: () => Promise<void>;
  markFounderOnboardingComplete: () => Promise<void>;
  markInvestorOnboardingComplete: () => Promise<void>;
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
          set({ user: null, tokens: null, hydrated: true });
          return;
        }
        set({ user: parsed.user, tokens: parsed.tokens, hydrated: true });
        return;
      }
    } catch {
      /* ignore corrupt session */
    }
    set({ hydrated: true });
  },

  async setSession(session) {
    await persistSession(session);
    set({ user: session.user, tokens: session.tokens });
  },

  async login(identifier, password) {
    const { user, tokens } = await authService.login({ identifier, password });
    await get().setSession({ user, tokens });
  },

  async logout() {
    await authService.logout();
    await persistSession(null);
    set({ user: null, tokens: null });
  },

  async clearMustChangePassword() {
    const { user, tokens } = get();
    if (!user || !tokens) return;
    const updated = { ...user, mustChangePassword: false };
    await get().setSession({ user: updated, tokens });
  },

  async markFounderOnboardingComplete() {
    const { user, tokens } = get();
    if (!user || !tokens) return;
    await get().setSession({ user: { ...user, founderOnboardingComplete: true }, tokens });
  },

  async markInvestorOnboardingComplete() {
    const { user, tokens } = get();
    if (!user || !tokens) return;
    await get().setSession({ user: { ...user, investorOnboardingComplete: true }, tokens });
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
