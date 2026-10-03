import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, style, ...rest },
  ref,
) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing[1] / 2,
  },
  input: {
    minHeight: touchTargetMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing[2],
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
