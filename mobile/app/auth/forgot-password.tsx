import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { forgotEmailSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import type { z } from 'zod';

type Form = z.infer<typeof forgotEmailSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: Form) => {
    await authService.requestPasswordReset(data.email);
    show('If an account exists, we sent a code.', 'success');
    router.push({ pathname: '/auth/reset-password', params: { email: data.email } });
  };

  return (
    <AuthScreen title="Forgot password" onBack={() => router.back()}>
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Send code" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
