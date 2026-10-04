import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type TextInputProps,
} from 'react-native';
import { Text, TextInput } from './Text';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Something to sit inside the field at its right edge, e.g. "Show" on a password. */
  right?: ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, right, style, onFocus, onBlur, ...rest },
  ref,
) {
  // The field she is typing in is outlined in the brand blue.
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {/* The field and what sits inside it share one box, so the extra is centred on the field whatever the label's height. */}
      <View>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, focused && styles.inputFocused, error && styles.inputError, right ? styles.inputWithRight : null, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...rest}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inputWithRight: { paddingRight: 72 },
  right: { position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' },
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
  // The browser's own black outline is replaced by the border.
  inputFocused: { borderColor: colors.primary, borderWidth: 2, outlineStyle: 'none' } as object,
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
