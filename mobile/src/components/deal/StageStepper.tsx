import { StyleSheet, View } from 'react-native';
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

const MARKER = 26;

/**
 * The six stages top to bottom, each a numbered circle: purple when done,
 * gold for the current one, an outline for the ones still to come.
 */
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
                <Text style={[styles.number, done && styles.numberDone, isCurrent && styles.numberCurrent]}>{i + 1}</Text>
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
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  markerCurrent: { backgroundColor: colors.accent, borderColor: colors.accent },
  number: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  numberDone: { color: colors.white },
  numberCurrent: { color: colors.primaryDark },
  line: { flex: 1, width: 1, minHeight: spacing[1.5], backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primary },
  words: { flex: 1, paddingTop: 3, paddingBottom: spacing[1.5], gap: 2 },
  wordsLast: { paddingBottom: 0 },
  label: { fontSize: 15, color: colors.textMuted },
  labelDone: { color: colors.text },
  labelCurrent: { fontSize: 16, fontWeight: '500', color: colors.primaryDark },
  hint: { fontSize: 13, color: colors.textMuted },
});
