import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '../../theme/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted' | 'accent';

const map: Record<BadgeVariant, { bg: string; fg: string }> = {
  default: { bg: colors.primaryLight, fg: colors.primary },
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.accentLight, fg: colors.accentText },
  error: { bg: colors.errorLight, fg: colors.error },
  muted: { bg: colors.grey100, fg: colors.textMuted },
  // The one loud badge: deep purple on gold.
  accent: { bg: colors.accent, fg: colors.primaryDark },
};

/** A status in words: "Strong fit", "Done", "Worth a call". */
export function Badge({ label, variant = 'default' }: { label: string; variant?: BadgeVariant }) {
  const c = map[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[1.5] - 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  text: { fontSize: 12, fontWeight: '500' },
});
