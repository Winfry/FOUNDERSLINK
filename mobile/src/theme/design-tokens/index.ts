/**
 * FounderLink design tokens — single source of truth for mobile and admin.
 * Solid colors only; no gradients.
 */

export const colors = {
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primaryLight: '#EFF6FF',
  white: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  /** Status — use sparingly */
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  /** Chat / neutral */
  grey100: '#F1F5F9',
  grey200: '#E2E8F0',
  grey300: '#CBD5E1',
} as const;

export const spacing = {
  0: 0,
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
} as const;

export const radius = {
  sm: 8,
  card: 12,
  full: 9999,
} as const;

export const typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const shadows = {
  /** Very subtle flat shadow — depth from border + light shadow */
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const touchTargetMin = 44;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
