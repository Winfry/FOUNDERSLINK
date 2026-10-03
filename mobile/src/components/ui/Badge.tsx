import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted';

const map: Record<BadgeVariant, { bg: string; fg: string }> = {
  default: { bg: colors.primaryLight, fg: colors.primaryDark },
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error },
  muted: { bg: colors.grey100, fg: colors.textMuted },
};

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
    paddingHorizontal: spacing[1],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
