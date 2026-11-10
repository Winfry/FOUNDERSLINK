/**
 * FoundersLink design tokens — single source of truth for mobile and admin.
 * Solid colors only; no gradients.
 */

export const colors = {
  /**
   * The brand: purple and gold (the design prototype, November 2026).
   * Purple is for actions and the tab you are on; deep purple for the top
   * bar and the side menu.
   */
  primary: '#5634A5',
  primaryDark: '#28184E',
  primaryLight: '#EEE9FB',
  /** A border on a light purple surface. */
  primaryBorder: '#D9CDF3',
  /**
   * The accent: gold. For shapes (a badge, a dot, progress, the beaded
   * stripe), one highlight per screen. Text on it is deep purple, never
   * white; gold is never used for text on white (it is too faint to read).
   */
  accent: '#E3B65D',
  accentLight: '#FBF3DF',
  /** Gold dark enough to read as text, on a light gold badge. */
  accentText: '#8A6516',
  white: '#FFFFFF',
  border: '#E9E4F1',
  text: '#21183B',
  textMuted: '#6E6685',
  /** The page behind cards: a faint lavender, so white cards stand out. */
  background: '#F8F7FB',
  surface: '#FFFFFF',
  /** Text and lines on deep purple. */
  onDark: '#FFFFFF',
  onDarkMuted: '#C9BDE6',
  onDarkLine: 'rgba(255,255,255,0.18)',
  /** Behind a dialog or sheet. */
  overlay: 'rgba(33, 24, 59, 0.45)',
  /** Status — use sparingly */
  success: '#21845B',
  successLight: '#E6F5EE',
  warning: '#B26A00',
  warningLight: '#FBF3DF',
  error: '#B83A52',
  errorDark: '#962D42',
  errorLight: '#FBECEF',
  /** Chat / neutral */
  grey100: '#F4F1F9',
  grey200: '#E9E4F1',
  grey300: '#D5CDE3',
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
  sm: 10,
  card: 18,
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
    shadowColor: '#2D1C55',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  /** Cards: a soft purple-tinted lift, as in the prototype. */
  md: {
    shadowColor: '#2D1C55',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 3,
  },
} as const;

/** Anything a finger presses is at least this tall. */
export const touchTargetMin = 48;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
