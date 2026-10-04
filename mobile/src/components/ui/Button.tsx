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

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<
  Variant,
  { container: ViewStyle; text: { color: string }; pressed: ViewStyle }
> = {
  primary: {
    container: { backgroundColor: colors.primary, borderWidth: 0 },
    text: { color: colors.white },
    pressed: { backgroundColor: colors.primaryDark },
  },
  secondary: {
    container: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.text },
    pressed: { backgroundColor: colors.primaryLight },
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 0 },
    text: { color: colors.primary },
    pressed: { backgroundColor: colors.primaryLight },
  },
  destructive: {
    container: { backgroundColor: colors.error, borderWidth: 0 },
    text: { color: colors.white },
    pressed: { backgroundColor: '#B91C1C' },
  },
};

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
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
        <Text style={[styles.label, v.text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargetMin,
    borderRadius: 14,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
