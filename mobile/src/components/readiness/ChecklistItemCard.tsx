import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { BANK_ACCOUNT_ITEM, BankOptions } from './BankOptions';
import type { ComplianceItem } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';

const STATE: Record<ComplianceItem['status'], string> = {
  not_started: 'To do',
  in_progress: 'In progress',
  complete: 'Done',
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
  /** Its place on the path, from 1. */
  number: number;
  /** The last step draws no line below its number. */
  last?: boolean;
  open: boolean;
  onToggle: () => void;
  saving: boolean;
  onMarkDone: () => void;
  onAskExpert: () => void;
}

/**
 * One step on the path to being ready: its number in a circle (purple
 * when done), a thin line down to the next, and a card with the title and
 * "Done" or "To do". Tapping the card opens why it matters and what to do.
 */
export function ChecklistItemCard({ item, number, last, open, onToggle, saving, onMarkDone, onAskExpert }: Props) {
  const done = item.status === 'complete';
  const state = STATE[item.status] ?? STATE.not_started;
  const when = item.deadline && !done ? `Due ${formatDeadline(item.deadline)}` : null;
  return (
    <View style={styles.step}>
      {!last ? <View style={styles.line} /> : null}
      <View style={[styles.stone, done && styles.stoneDone]}>
        <Text style={[styles.stoneText, done && styles.stoneTextDone]}>{number}</Text>
      </View>
      <View style={[styles.card, open && styles.cardOpen]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${item.label}. ${state}${when ? `. ${when}` : ''}`}
          onPress={onToggle}
          style={({ pressed }) => [styles.head, pressed && styles.pressed]}
        >
          <Text style={styles.title}>{item.label}</Text>
          <Text style={[styles.state, done && styles.stateDone]}>{[state, when].filter(Boolean).join(' · ')}</Text>
        </Pressable>
        {open ? (
          <View style={styles.more}>
            {item.description ? (
              <>
                <Text style={styles.label}>Why it matters</Text>
                <Text style={styles.why}>{item.description}</Text>
              </>
            ) : null}
            {item.id === BANK_ACCOUNT_ITEM && !done ? <BankOptions /> : null}
            <View style={styles.buttons}>
              {!done ? (
                <Button
                  title="Mark as done"
                  loading={saving}
                  onPress={onMarkDone}
                  accessibilityLabel={`Mark ${item.label} as done`}
                />
              ) : null}
              <Button
                title="Talk to an expert"
                variant="soft"
                onPress={onAskExpert}
                accessibilityLabel={`Ask which expert could help with ${item.label}`}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const STONE = 34;

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5], paddingBottom: 10 },
  line: { position: 'absolute', left: STONE / 2, top: STONE + 2, bottom: 0, width: 1, backgroundColor: colors.borderStrong },
  stone: {
    width: STONE,
    height: STONE,
    borderRadius: STONE / 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoneDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stoneText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  stoneTextDone: { color: colors.white },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  cardOpen: { borderColor: colors.primaryLine },
  head: { paddingHorizontal: 14, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  title: { fontSize: 15, fontWeight: '500', color: colors.text },
  state: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  stateDone: { color: colors.success },
  more: { paddingHorizontal: 14, paddingBottom: 14, gap: spacing[0.5] },
  label: { fontSize: 12, color: colors.textMuted },
  why: { fontSize: 14, color: colors.textMuted },
  buttons: { gap: spacing[1], marginTop: spacing[1] },
});
