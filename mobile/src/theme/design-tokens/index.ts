/**
 * FoundersLink design tokens — single source of truth for mobile and admin.
 *
 * The look is the approved hybrid design (docs/design/founderslink-hybrid.html,
 * November 2026): deep purple for the side menu and top bar, purple for
 * actions, a warm paper page, white cards, and gold for one detail per
 * screen. People are shown by photo or initials; there are no drawings.
 */

export const colors = {
  /** Purple: buttons, links, the tab you are on, progress. */
  primary: '#5634A5',
  /** Deep purple: the side menu, the top bar, big numbers. */
  primaryDark: '#28184E',
  /** Lavender: soft buttons, initials, segmented controls. */
  primaryLight: '#F0ECF8',
  /** A second lavender: empty progress, borders on lavender. */
  primaryBorder: '#E4DDF3',
  /** The outline of a secondary (line) button. */
  primaryLine: 'rgba(86,52,165,0.28)',
  /**
   * Gold: one detail per screen (the mark on the tab you are on, the
   * "Your next step" dot, a gold button on purple). Text on gold is deep
   * purple; gold is never used for text on white.
   */
  accent: '#E3B65D',
  accentLight: '#FBF4E4',
  /** Gold dark enough to read as text, on a light gold badge. */
  accentText: '#8A6516',
  white: '#FFFFFF',
  border: 'rgba(40,24,78,0.09)',
  /** A stronger line: table rules, outlines of quiet controls. */
  borderStrong: 'rgba(40,24,78,0.16)',
  text: '#251B3D',
  textMuted: '#716A7D',
  /** Hints and small labels. */
  textDim: '#9A93A5',
  /** The page behind cards. */
  background: '#F8F6FB',
  /** The warm paper around the app on a computer. */
  paper: '#F7F5F1',
  surface: '#FFFFFF',
  /** Text and lines on deep purple. */
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.72)',
  onDarkDim: 'rgba(255,255,255,0.55)',
  onDarkLine: 'rgba(255,255,255,0.16)',
  /** Behind a dialog or sheet. */
  overlay: 'rgba(37, 27, 61, 0.45)',
  /** Status — use sparingly */
  success: '#28765D',
  successLight: '#E7F3EE',
  warning: '#8A6516',
  warningLight: '#FBF4E4',
  error: '#A93A4F',
  errorDark: '#8E2F42',
  errorLight: '#FAEBEE',
  /** Neutral fills */
  grey100: '#F3F1F6',
  grey200: '#E9E6EF',
  grey300: '#D5CFE0',
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
  /** Rows, inputs and small panels. */
  md: 14,
  card: 18,
  full: 9999,
} as const;

/**
 * The type scale. Inter Tight: light (300) for big headings and numbers,
 * regular (400) for reading, medium (500) for names, labels and buttons.
 * Never heavier than semibold. Sentence case, never all caps.
 */
export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '300' },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '300' },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '500' },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

export const typography = {
  fontFamily: 'Inter Tight',
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
  /** Cards: a soft purple-tinted lift. */
  sm: {
    shadowColor: '#28184E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 1,
  },
  /** Avatars and raised parts. */
  md: {
    shadowColor: '#28184E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

/** Anything a finger presses is at least this tall. */
export const touchTargetMin = 48;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
