import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme/tokens';

// The one bold thing on the screen. A count, never a score.
export function ProgressHero({ done, total }: { done: number; total: number }) {
  const left = total - done;
  const note =
    total === 0
      ? 'Nothing on your list yet.'
      : left === 0
        ? 'Everything on your list is done.'
        : `${left} left to do. Each one you finish opens the door to more investors.`;
  return (
    <View style={styles.block}>
      <Text style={styles.count} accessibilityRole="header">{done} of {total} done</Text>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: done }}
      >
        <View style={[styles.fill, { width: total > 0 ? `${(done / total) * 100}%` : '0%' }]} />
      </View>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    padding: spacing[3],
    gap: spacing[1.5],
  },
  count: { fontSize: 24, fontWeight: '800', color: colors.white },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  fill: { height: 10, borderRadius: radius.full, backgroundColor: colors.accent, minWidth: 10 },
  note: { fontSize: 14, color: 'rgba(255,255,255,0.82)' },
});
