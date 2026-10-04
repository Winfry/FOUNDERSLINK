import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Input } from './Input';
import { passwordStrength } from '../../lib/validation';
import { colors, spacing } from '../../theme/tokens';
import type { TextInputProps } from 'react-native';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  error?: string;
  showStrength?: boolean;
  value?: string;
}

export function PasswordInput({
  label,
  error,
  showStrength,
  value = '',
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;

  return (
    <View>
      <Input
        label={label}
        error={error}
        secureTextEntry={!visible}
        value={value}
        autoCapitalize="none"
        autoCorrect={false}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((v) => !v)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        }
        {...rest}
      />
      {strength && value.length > 0 ? (
        <View style={styles.strengthRow}>
          <View style={styles.strengthTrack}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthSegment,
                  i < strength.score && { backgroundColor: colors.primary },
                ]}
              />
            ))}
          </View>
          <Text style={styles.strengthLabel}>{strength.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    minWidth: 64,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing[1],
    marginBottom: spacing[2],
    gap: spacing[1],
  },
  strengthTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  strengthLabel: { fontSize: 12, color: colors.textMuted, minWidth: 48 },
});
