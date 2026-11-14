import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

export interface KindChoice {
  value: string;
  title: string;
  line: string;
}

/**
 * One choice out of three, stacked. Three cards side by side are too
 * narrow on a phone for "Venture capital fund" and "Accelerator".
 */
export function KindPicker({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: KindChoice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      {choices.map(({ value: v, title, line }) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${title}. ${line}`}
            style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.words}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.line}>{line}</Text>
            </View>
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[1] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    minHeight: touchTargetMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.white,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  words: { flex: 1 },
  title: { fontSize: 16, fontWeight: '500', color: colors.primaryDark },
  line: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
