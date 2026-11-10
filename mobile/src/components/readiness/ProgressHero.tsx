import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing } from '../../theme/tokens';

// The one bold thing on the screen. A count, never a score.
export function ProgressHero({ done, total }: { done: number; total: number }) {
  const left = total - done;
  // Encouraging, and honest about what is left: a count, never a score.
  const share = total > 0 ? done / total : 0;
  const note =
    total === 0
      ? 'Nothing on your list yet.'
      : left === 0
        ? 'Everything on your list is done. Investors can see you are ready.'
        : done === 0
          ? `${left} to do. Start with one: each you finish opens the door to more investors.`
          : share >= 0.5
            ? `More than halfway there. ${left} left, and each one opens the door to more investors.`
            : `A good start. ${left} left to do, and each one opens the door to more investors.`;
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
    borderRadius: radius.card,
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
