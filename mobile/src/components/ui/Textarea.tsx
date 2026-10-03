import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

interface TextareaProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Textarea({ label, error, style, ...rest }: TextareaProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing[2],
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
});
