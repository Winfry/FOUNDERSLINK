import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, PasswordInput } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { setPasswordSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof setPasswordSchema>;

export default function SetNewPasswordScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);
  const { show } = useToast();
  const { control, handleSubmit, watch, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: Form) => {
    try {
      await authService.setNewPassword(user!.id, 'TempPass2026!', data.newPassword);
      await clearMustChangePassword();
      show('Password updated', 'success');
      router.replace('/');
    } catch (e: unknown) {
      show((e as { message?: string })?.message ?? 'Could not update password', 'error');
    }
  };

  return (
    <AuthScreen title="Set new password" subtitle="Required on first login after your application was approved">
      <Text style={styles.rules}>
        At least 8 characters, upper & lower case, a number. Cannot reuse your temporary password.
      </Text>
      <Controller control={control} name="newPassword" render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <PasswordInput label="New password" showStrength value={value} onBlur={onBlur} onChangeText={onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="confirmPassword" render={({ field, fieldState }) => (
        <PasswordInput label="Confirm password" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Continue to FounderLink" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  rules: { color: colors.textMuted, marginBottom: spacing[2], lineHeight: 20 },
});
