import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme/tokens';

/** A bordered box holding menu rows, with a line between each. */
export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.box}>{children}</View>
    </View>
  );
}

/** One row of a menu: an icon in a tinted circle, a label, and a chevron. */
export function MenuRow({
  icon: Icon,
  label,
  hint,
  onPress,
  destructive,
  last,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onPress: () => void;
  /** Quiet red, for leaving or deleting. */
  destructive?: boolean;
  /** The last row of a group has no line under it. */
  last?: boolean;
}) {
  const tint = destructive ? colors.error : colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, !last && styles.line, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: destructive ? colors.errorLight : colors.primaryLight }]}>
        <Icon size={20} color={tint} />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.label, destructive && { color: colors.error }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {destructive ? null : <ChevronRight size={20} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing[1] },
  groupTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  box: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  line: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.grey100 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  labels: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
});
