import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { forgotIdentifierSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import type { z } from 'zod';

type Form = z.infer<typeof forgotIdentifierSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(forgotIdentifierSchema),
    defaultValues: { identifier: '' },
  });

  const onSubmit = async (data: Form) => {
    await authService.requestPasswordReset(data.identifier);
    show('OTP sent if account exists', 'success');
    router.push({ pathname: '/auth/forgot-password-otp', params: { identifier: data.identifier } });
  };

  return (
    <AuthScreen title="Forgot password" onBack={() => router.back()}>
      <Controller control={control} name="identifier" render={({ field, fieldState }) => (
        <Input label="Email or User ID" autoCapitalize="none" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Send OTP" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
