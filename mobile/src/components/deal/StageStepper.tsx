import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '../ui/Text';
import type { DealStage } from '../../types';
import { colors, spacing } from '../../theme/tokens';

export const DEAL_STAGES: { key: DealStage; label: string; hint: string }[] = [
  { key: 'exploring', label: 'Exploring', hint: 'You are getting to know each other and shaping the terms.' },
  { key: 'due_diligence', label: 'Due diligence', hint: 'Each side shares its documents, then confirms the terms.' },
  { key: 'terms_agreed', label: 'Terms agreed', hint: 'Everyone has said yes to the terms.' },
  { key: 'documents_compliance', label: 'Documents & compliance', hint: 'The paperwork is finished before the deal closes.' },
  { key: 'closed', label: 'Closed', hint: 'Every party has agreed to close the deal.' },
  { key: 'active', label: 'Active', hint: 'The deal is running.' },
];

export function stageLabel(stage: DealStage) {
  return DEAL_STAGES.find((s) => s.key === stage)?.label ?? 'In progress';
}

const MARKER = 24;

/** The six stages top to bottom: done ones ticked, the current one marked in orange. */
export function StageStepper({ stage }: { stage: DealStage }) {
  const current = Math.max(0, DEAL_STAGES.findIndex((s) => s.key === stage));

  return (
    <View accessibilityLabel={`Stage ${current + 1} of ${DEAL_STAGES.length}: ${DEAL_STAGES[current].label}`}>
      {DEAL_STAGES.map((s, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const last = i === DEAL_STAGES.length - 1;
        return (
          <View key={s.key} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.marker, done && styles.markerDone, isCurrent && styles.markerCurrent]}>
                {done ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
                {isCurrent ? <View style={styles.currentDot} /> : null}
              </View>
              {last ? null : <View style={[styles.line, done && styles.lineDone]} />}
            </View>
            <View style={[styles.words, last && styles.wordsLast]}>
              <Text style={[styles.label, done && styles.labelDone, isCurrent && styles.labelCurrent]}>{s.label}</Text>
              {isCurrent ? <Text style={styles.hint}>{s.hint}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[1.5] },
  rail: { width: MARKER, alignItems: 'center' },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 2,
    borderColor: colors.grey300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  markerCurrent: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  currentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  line: { flex: 1, width: 2, minHeight: spacing[1.5], backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primary },
  words: { flex: 1, paddingBottom: spacing[1.5], gap: 2 },
  wordsLast: { paddingBottom: 0 },
  label: { fontSize: 16, fontWeight: '500', color: colors.textMuted },
  labelDone: { color: colors.text },
  labelCurrent: { fontSize: 17, fontWeight: '700', color: colors.text },
  hint: { fontSize: 14, color: colors.textMuted },
});
