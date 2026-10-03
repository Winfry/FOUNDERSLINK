import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  founderStep: number;
  founderData: Record<string, unknown>;
  investorAppStep: number;
  investorAppData: Record<string, unknown>;
  investorMatchStep: number;
  investorMatchData: Record<string, unknown>;
  setFounder: (step: number, data: Record<string, unknown>) => void;
  setInvestorApp: (step: number, data: Record<string, unknown>) => void;
  setInvestorMatch: (step: number, data: Record<string, unknown>) => void;
  clearFounder: () => void;
  clearInvestorApp: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      founderStep: 1,
      founderData: {},
      investorAppStep: 1,
      investorAppData: {},
      investorMatchStep: 1,
      investorMatchData: {},
      setFounder: (step, data) =>
        set({ founderStep: step, founderData: { ...get().founderData, ...data } }),
      setInvestorApp: (step, data) =>
        set({ investorAppStep: step, investorAppData: { ...get().investorAppData, ...data } }),
      setInvestorMatch: (step, data) =>
        set({
          investorMatchStep: step,
          investorMatchData: { ...get().investorMatchData, ...data },
        }),
      clearFounder: () => set({ founderStep: 1, founderData: {} }),
      clearInvestorApp: () => set({ investorAppStep: 1, investorAppData: {} }),
    }),
    {
      name: 'founderlink-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
