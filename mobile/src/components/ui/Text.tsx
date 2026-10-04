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
 * - Font: Plus Jakarta Sans. On a phone each weight is its own font
 *   file, so the weight a screen asks for is turned into the matching
 *   family (asking for "bold" on a custom font otherwise gives a faked,
 *   smeared bold).
 * - Scale: seven sizes (32, 24, 20, 17, 16, 14, 12). A size a screen
 *   asks for is moved to the nearest step, and gets that step's line
 *   height unless the screen set its own.
 */
const FAMILIES = {
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
} as const;

// [largest size that maps to this step, the step's size, its line height]
const SCALE: [number, number, number][] = [
  [12.5, 12, 16],
  [15, 14, 20],
  [16.5, 16, 24],
  [19, 17, 24],
  [22, 20, 26],
  [28, 24, 30],
  [Infinity, 32, 38],
];

function familyFor(weight: TextStyle['fontWeight'], size: number) {
  const asked = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 500 : Number(weight);
  // The two largest sizes are headings, and headings are extra bold.
  if (size >= 24 && asked >= 700) return FAMILIES[800];
  if (asked >= 800) return FAMILIES[800];
  if (asked >= 700) return FAMILIES[700];
  if (asked >= 600) return FAMILIES[600];
  return FAMILIES[500];
}

function scaled(style: TextProps['style'], defaultSize = 16): TextStyle {
  const { fontWeight, fontSize, lineHeight, ...rest } = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const [, size, line] = SCALE.find(([max]) => (fontSize ?? defaultSize) <= max)!;
  return {
    color: colors.text,
    ...rest,
    fontSize: size,
    lineHeight: lineHeight === undefined ? line : Math.max(lineHeight, size + 4),
    fontFamily: familyFor(fontWeight, size),
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
