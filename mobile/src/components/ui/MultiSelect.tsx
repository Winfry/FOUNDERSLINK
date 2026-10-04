import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { X } from 'lucide-react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  error,
  labels,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  /** What to show for each option, when the option itself is an id. */
  labels?: Record<string, string>;
}) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => toggle(opt)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{labels?.[opt] ?? opt}</Text>
              {active ? <X size={14} color={colors.primaryDark} /> : null}
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: spacing[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  chip: {
    // A long label wraps inside its chip instead of running off the screen.
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[1],
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  chipTextActive: { color: colors.primaryDark, fontWeight: '600' },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
});
