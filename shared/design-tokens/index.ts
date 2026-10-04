/**
 * FounderLink design tokens — single source of truth for mobile and admin.
 * Solid colors only; no gradients.
 */

export const colors = {
  /** The logo's blue and navy. */
  primary: '#0454DB',
  primaryDark: '#113373',
  primaryLight: '#EAF1FE',
  /**
   * The accent: a hot orange, opposite the logo's blue. For shapes (a
   * badge, a dot, progress), one highlight per screen. Text on it is
   * navy (primaryDark), never white. Buttons stay blue; red stays for errors.
   */
  accent: '#FF5A1F',
  accentLight: '#FFF0EA',
  white: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0E1B3D',
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

/**
 * Everything is a multiple of 4.
 *   4  icon to its label          8  label to field, lines in a card
 *  12  inside chips and rows     16  screen sides, inside cards, between fields
 *  24  between sections          32  above a screen's heading, before the main button
 */
export const spacing = {
  0: 0,
  0.5: 4,
  1: 8,
  1.5: 12,
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
  card: 16,
  full: 9999,
} as const;

/**
 * The type scale: seven sizes and nothing in between. Sentence case,
 * never all caps. Body text never below 14.
 */
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;

export const typography = {
  fontFamily: 'Plus Jakarta Sans',
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

/** Anything a finger presses is at least this tall. */
export const touchTargetMin = 48;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
