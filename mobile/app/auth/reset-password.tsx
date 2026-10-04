import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input, PasswordInput } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { resetPasswordSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import type { z } from 'zod';

type Form = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { show } = useToast();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: String(email ?? ''), code: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: Form) => {
    await authService.resetPassword(data.email, data.code, data.newPassword);
    show('Password updated', 'success');
    router.replace('/auth/login');
  };

  return (
    <AuthScreen title="Reset password" subtitle="Enter the code we emailed you" onBack={() => router.back()}>
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Input label="Email" autoCapitalize="none" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="code" render={({ field, fieldState }) => (
        <Input label="Code" keyboardType="number-pad" maxLength={6} {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="newPassword" render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <PasswordInput label="New password" showStrength value={value} onBlur={onBlur} onChangeText={onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="confirmPassword" render={({ field, fieldState }) => (
        <PasswordInput label="Confirm password" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Save password" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
