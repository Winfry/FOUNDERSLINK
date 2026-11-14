import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

/**
 * - primary: purple, the main action on a screen.
 * - secondary: a purple outline, the second choice beside it.
 * - soft: lavender, a quiet way on ("See all investors").
 * - gold: gold on deep purple, for the one action on a purple surface.
 * - ghost: words only.
 * - destructive: for deleting and leaving.
 */
type Variant = 'primary' | 'secondary' | 'soft' | 'gold' | 'ghost' | 'destructive';
type Size = 'md' | 'sm';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<Variant, { container: ViewStyle; text: { color: string }; pressed: ViewStyle }> = {
  primary: {
    container: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { color: colors.white },
    pressed: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  },
  secondary: {
    container: { backgroundColor: colors.white, borderColor: colors.primaryLine },
    text: { color: colors.primary },
    pressed: { backgroundColor: colors.primaryLight },
  },
  soft: {
    container: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
    text: { color: colors.primary },
    pressed: { backgroundColor: colors.primaryBorder, borderColor: colors.primaryBorder },
  },
  gold: {
    container: { backgroundColor: colors.accent, borderColor: colors.accent },
    text: { color: colors.primaryDark },
    pressed: { opacity: 0.85 },
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderColor: 'transparent' },
    text: { color: colors.primary },
    pressed: { backgroundColor: colors.primaryLight },
  },
  destructive: {
    container: { backgroundColor: colors.error, borderColor: colors.error },
    text: { color: colors.white },
    pressed: { backgroundColor: colors.errorDark, borderColor: colors.errorDark },
  },
};

export function Button({ title, variant = 'primary', size = 'md', loading, disabled, style, ...rest }: ButtonProps) {
  const v = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        v.container,
        (disabled || loading) && styles.disabled,
        pressed && v.pressed,
        // A slight squeeze, so a press is felt the instant it lands.
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <Text style={[styles.label, size === 'sm' && styles.labelSmall, v.text]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargetMin,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: spacing[2], paddingVertical: 6 },
  label: { fontSize: 15, fontWeight: '500' },
  labelSmall: { fontSize: 13 },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
