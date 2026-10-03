import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';
import { BottomSheet } from './BottomSheet';

export interface SelectOption {
  label: string;
  value: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = 'Select…',
}: {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, error && styles.triggerError]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={20} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={styles.option}
            onPress={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            <Text style={styles.optionText}>{opt.label}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  trigger: {
    minHeight: touchTargetMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerError: { borderColor: colors.error },
  value: { fontSize: 16, color: colors.text },
  placeholder: { fontSize: 16, color: colors.textMuted },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
  option: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 16, color: colors.text },
});
