import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
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
      <View>
        <Input
          label={label}
          error={error}
          secureTextEntry={!visible}
          value={value}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
        <Pressable
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
          hitSlop={12}
        >
          {visible ? (
            <EyeOff size={20} color={colors.textMuted} />
          ) : (
            <Eye size={20} color={colors.textMuted} />
          )}
        </Pressable>
      </View>
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
  eye: {
    position: 'absolute',
    right: spacing[2],
    top: 38,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
