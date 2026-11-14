import { forwardRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { colors } from '../../theme/tokens';

/**
 * Every piece of text in the app goes through here, so the font and the
 * type scale are applied in one place and screens cannot drift.
 *
 * - Font: Inter Tight. On a phone each weight is its own font file, so
 *   the weight a screen asks for is turned into the matching family
 *   (asking for "bold" on a custom font otherwise gives a faked bold).
 * - Weights: big headings and numbers (24 and up) are light, the way the
 *   approved design sets them; names, labels and buttons are medium;
 *   reading text is regular. Nothing is heavier than semibold, so older
 *   screens that ask for 700 or 800 come out calm, not shouting.
 * - Scale: a fixed set of sizes. A size a screen asks for is moved to the
 *   nearest step, and gets that step's line height unless it set its own.
 */
const FAMILIES = {
  300: 'InterTight_300Light',
  400: 'InterTight_400Regular',
  500: 'InterTight_500Medium',
  600: 'InterTight_600SemiBold',
} as const;

// [largest size that maps to this step, the step's size, its line height]
const SCALE: [number, number, number][] = [
  [12.5, 12, 16],
  [13.5, 13, 18],
  [14.5, 14, 20],
  [15.5, 15, 22],
  [16.5, 16, 24],
  [18.5, 17, 24],
  [22, 20, 26],
  [26, 24, 30],
  [31, 28, 34],
  [37, 34, 38],
  [Infinity, 40, 44],
];

function familyFor(weight: TextStyle['fontWeight'], size: number) {
  const asked = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  // Headings: light, unless a screen asks for medium on purpose (a name in a greeting).
  if (size >= 24) return asked === 500 || asked === 600 ? FAMILIES[500] : FAMILIES[300];
  if (asked <= 300) return FAMILIES[300];
  if (asked >= 800) return FAMILIES[600];
  if (asked >= 500) return FAMILIES[500];
  return FAMILIES[400];
}

function scaled(style: TextProps['style'], defaultSize = 15): TextStyle {
  const { fontWeight, fontSize, lineHeight, ...rest } = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const [, size, line] = SCALE.find(([max]) => (fontSize ?? defaultSize) <= max)!;
  return {
    color: colors.text,
    ...rest,
    fontSize: size,
    lineHeight: lineHeight === undefined ? line : Math.max(lineHeight, size + 4),
    fontFamily: familyFor(fontWeight, size),
    // Big light type is set a little tighter, as in the design.
    ...(size >= 24 && rest.letterSpacing === undefined ? { letterSpacing: -size * 0.03 } : {}),
  };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={scaled(style)} />;
}

// Screens hold a ref to an input (to focus the next field), so it is passed on.
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  // An input keeps the height its screen gave it, so only the font and size are set.
  const { lineHeight: _lineHeight, ...text } = scaled(style);
  // In a browser, a focused field gets the browser's own outline, which
  // is black. Wherever a field does not draw its own, it is brand blue.
  const focusRing = { outlineColor: colors.primary } as object;
  return <RNTextInput ref={ref} placeholderTextColor={colors.textMuted} {...props} style={[focusRing, text]} />;
});
export type TextInput = RNTextInput;
