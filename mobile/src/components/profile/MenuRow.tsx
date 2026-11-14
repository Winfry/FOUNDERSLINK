import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, shadows, spacing } from '../../theme/tokens';

/** A white card holding menu rows, with a line between each. */
export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.box}>{children}</View>
    </View>
  );
}

/**
 * One row of a menu: what it is, a short line about it, and "Open" in
 * purple on the right. No icons: the words say where it goes. (`icon` is
 * accepted and ignored, so older screens keep compiling.)
 */
export function MenuRow({
  label,
  hint,
  onPress,
  destructive,
  last,
}: {
  icon?: unknown;
  label: string;
  hint?: string;
  onPress: () => void;
  /** Quiet red, for leaving or deleting. */
  destructive?: boolean;
  /** The last row of a group has no line under it. */
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, !last && styles.line, pressed && styles.pressed]}
    >
      <View style={styles.labels}>
        <Text style={[styles.label, destructive && { color: colors.error }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {destructive ? null : <Text style={styles.open}>Open</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing[1] },
  groupTitle: { fontSize: 12, color: colors.textMuted },
  box: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
  },
  line: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.grey100 },
  labels: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  open: { fontSize: 13, fontWeight: '500', color: colors.primary },
});
