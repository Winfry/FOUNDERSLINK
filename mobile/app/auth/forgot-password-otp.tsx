import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input } from '../../src/components/ui';
import { otpSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import type { z } from 'zod';

type Form = z.infer<typeof otpSchema>;

export default function ForgotPasswordOtpScreen() {
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const router = useRouter();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = async (data: Form) => {
    await authService.verifyResetOtp(String(identifier), data.otp);
    router.push({ pathname: '/auth/reset-password', params: { identifier, otp: data.otp } });
  };

  return (
    <AuthScreen title="Enter OTP" onBack={() => router.back()}>
      <Controller control={control} name="otp" render={({ field, fieldState }) => (
        <Input label="6-digit code" keyboardType="number-pad" maxLength={6} {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Continue" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
