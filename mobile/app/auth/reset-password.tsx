import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, PasswordInput } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { setPasswordSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import type { z } from 'zod';

type Form = z.infer<typeof setPasswordSchema>;

export default function ResetPasswordScreen() {
  const { identifier, otp } = useLocalSearchParams<{ identifier: string; otp: string }>();
  const router = useRouter();
  const { show } = useToast();
  const { control, handleSubmit, watch, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: Form) => {
    await authService.resetPassword(String(identifier), String(otp), data.newPassword);
    show('Password updated', 'success');
    router.replace('/auth/login');
  };

  return (
    <AuthScreen title="New password" onBack={() => router.back()}>
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
