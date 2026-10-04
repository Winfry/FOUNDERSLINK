import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { AuthShell } from '../../src/components/auth/AuthShell';
import { CodeInput, FormError, PasswordRules } from '../../src/components/auth/parts';
import { Button, Input, PasswordInput } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { resetPasswordSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import { spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [refused, setRefused] = useState<string | null>(null);
  const { control, handleSubmit, watch, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: String(email ?? ''), code: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = watch('newPassword');

  const onSubmit = async (data: Form) => {
    setRefused(null);
    try {
      await authService.resetPassword(data.email, data.code, data.newPassword);
      show('Password updated. Log in with the new one.', 'success');
      router.replace('/auth/login');
    } catch (e: unknown) {
      setRefused((e as { message?: string })?.message ?? 'We could not save the new password. Check the code and try again.');
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      helper="Enter the six-digit code we emailed you, then choose a new password."
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/auth/login'))}
    >
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Input
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          {...field}
          onChangeText={field.onChange}
          error={fieldState.error?.message}
        />
      )} />
      <Controller control={control} name="code" render={({ field, fieldState }) => (
        <CodeInput label="Six-digit code" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="newPassword" render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <PasswordInput label="New password" showStrength value={value} onBlur={onBlur} onChangeText={onChange} error={fieldState.error?.message} />
      )} />
      <PasswordRules password={newPassword} />
      <Controller control={control} name="confirmPassword" render={({ field, fieldState }) => (
        <PasswordInput label="Type the new password again" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <View style={styles.action}>
        <FormError message={refused} />
        <Button title="Save password" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing[2] },
});
