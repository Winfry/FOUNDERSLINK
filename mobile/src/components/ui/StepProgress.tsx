import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

export function StepProgress({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels?: string[];
}) {
  const pct = Math.round((current / total) * 100);
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ now: current, min: 1, max: total }}>
      <View style={styles.row}>
        <Text style={styles.stepText}>
          Step {current} of {total}
        </Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {labels?.[current - 1] ? (
        <Text style={styles.label}>{labels[current - 1]}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] / 2 },
  stepText: { fontSize: 14, fontWeight: '600', color: colors.text },
  pct: { fontSize: 14, color: colors.textMuted },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary },
  label: { marginTop: spacing[1] / 2, fontSize: 13, color: colors.textMuted },
});
