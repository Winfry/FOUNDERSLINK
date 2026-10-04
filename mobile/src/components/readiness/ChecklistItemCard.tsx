import { CalendarDays, CircleCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { BANK_ACCOUNT_ITEM, BankOptions } from './BankOptions';
import type { ComplianceItem } from '../../types';
import { colors, shadows, spacing } from '../../theme/tokens';

const STATUS: Record<ComplianceItem['status'], { label: string; variant: 'muted' | 'default' | 'success' }> = {
  not_started: { label: 'Not started', variant: 'muted' },
  in_progress: { label: 'In progress', variant: 'default' },
  complete: { label: 'Done', variant: 'success' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-05-01" reads as "1 May 2026". Anything else is shown as it came.
export function formatDeadline(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : value;
}

interface Props {
  item: ComplianceItem;
  saving: boolean;
  onMarkDone: () => void;
}

export function ChecklistItemCard({ item, saving, onMarkDone }: Props) {
  const done = item.status === 'complete';
  const status = STATUS[item.status] ?? STATUS.not_started;
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.head}>
        {done ? <CircleCheck size={22} color={colors.success} style={styles.tick} /> : null}
        <Text style={[styles.title, done && styles.titleDone]}>{item.label}</Text>
      </View>
      {item.description ? <Text style={styles.why}>{item.description}</Text> : null}
      <View style={styles.facts}>
        <Badge label={status.label} variant={status.variant} />
        {item.deadline && !done ? (
          <View style={styles.deadline}>
            <CalendarDays size={16} color={colors.textMuted} />
            <Text style={styles.deadlineText}>Due {formatDeadline(item.deadline)}</Text>
          </View>
        ) : null}
      </View>
      {item.id === BANK_ACCOUNT_ITEM && !done ? <BankOptions /> : null}
      {!done ? (
        <Button
          title="Mark as done"
          variant="secondary"
          loading={saving}
          onPress={onMarkDone}
          accessibilityLabel={`Mark ${item.label} as done`}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[2],
    gap: spacing[1],
    ...shadows.sm,
  },
  cardDone: { backgroundColor: colors.grey100, shadowOpacity: 0, elevation: 0 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  tick: { marginTop: 1 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  titleDone: { color: colors.textMuted },
  why: { fontSize: 14, color: colors.textMuted },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[0.5] },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  deadlineText: { fontSize: 14, color: colors.textMuted },
  button: { marginTop: spacing[1] },
});
