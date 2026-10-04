import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme/tokens';
import type { CircleRole } from '../../types';

/** "KSh 2,500". */
export function ksh(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

export const TYPE_LABEL: Record<'money' | 'learning', string> = {
  money: 'Money circle',
  learning: 'Learning circle',
};

export const ROLE_LABEL: Record<CircleRole, string> = {
  organiser: 'Organiser',
  treasurer: 'Treasurer',
  member: 'Member',
};

/** "4 Oct 2026". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** A titled group of rows inside one bordered box. */
export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined ? <Text style={styles.count}>{count}</Text> : null}
      </View>
      <View style={styles.box}>{children}</View>
    </View>
  );
}

/** One row in a Section: something on the left, two lines of text, something on the right. */
export function Row({
  left,
  title,
  sub,
  right,
  last,
}: {
  left?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.line]}>
      {left}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[1] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  count: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  box: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing[2],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[1.5], minHeight: 56 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
});
