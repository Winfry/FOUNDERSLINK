import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '../../theme/tokens';

/**
 * The small marks of the design, used across screens so they always look
 * the same: how well someone fits (three short bars), progress (a thin
 * segmented bar), the AI mark, and the gold dot before "Your next step".
 */

/** Fit as three short bars: 3 strong, 2 good, 1 after a fix (in gold), 0 not a fit. */
export function FitBars({ filled, fix = false }: { filled: number; fix?: boolean }) {
  return (
    <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.bar, i < filled && { backgroundColor: fix ? '#D19B3C' : colors.primary }]} />
      ))}
    </View>
  );
}

/** "Strong fit" with its bars. */
export function Fit({ label, filled, fix }: { label: string; filled: number; fix?: boolean }) {
  return (
    <View style={styles.fit}>
      <FitBars filled={filled} fix={fix} />
      <Text style={styles.fitText}>{label}</Text>
    </View>
  );
}

/** Progress in segments: one per step, purple when done. */
export function SegmentBar({ done, total, style, height = 5 }: { done: number; total: number; style?: StyleProp<ViewStyle>; height?: number }) {
  return (
    <View style={[styles.segs, style]} accessibilityLabel={`${done} of ${total} done`}>
      {Array.from({ length: Math.max(total, 1) }, (_, i) => (
        <View key={i} style={[styles.seg, { height, borderRadius: height / 2 }, i < done && styles.segOn]} />
      ))}
    </View>
  );
}

/** The six stages of a deal: done in purple, the current one in gold. */
export function StageBar({ index, total = 6 }: { index: number; total?: number }) {
  return (
    <View style={styles.segs}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, { height: 4 }, i < index && styles.segOn, i === index && { backgroundColor: colors.accent }]} />
      ))}
    </View>
  );
}

/** The AI: a gold circle marked "AI", so it reads as a tool, not a person. */
export function AiMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.ai, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel="AI">
      <Text style={[styles.aiText, { fontSize: Math.max(12, Math.round(size * 0.32)) }]}>AI</Text>
    </View>
  );
}

/** A small gold dot and a gold-brown label, e.g. "Your next step". */
export function Eyebrow({ label }: { label: string }) {
  return (
    <View style={styles.eyebrow}>
      <View style={styles.dot} />
      <Text style={styles.eyebrowText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', gap: 3 },
  bar: { width: 12, height: 3, borderRadius: 2, backgroundColor: colors.borderStrong },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fitText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  segs: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, backgroundColor: colors.primaryBorder },
  segOn: { backgroundColor: colors.primary },
  ai: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  aiText: { color: colors.primaryDark, fontWeight: '600' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.accent },
  eyebrowText: { fontSize: 12, fontWeight: '600', color: colors.accentText },
});
