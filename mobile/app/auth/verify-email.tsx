import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { otpSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof otpSchema>;

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { show } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = async (data: Form) => {
    try {
      await authService.verifyEmailOtp(String(email), data.otp);
      await setSession({
        user: {
          id: 'u-founder-new',
          role: 'founder',
          email: String(email),
          fullName: 'New Founder',
          founderOnboardingComplete: false,
        },
        tokens: {
          accessToken: 'mock',
          refreshToken: 'mock',
          expiresAt: Date.now() + 3600000,
        },
      });
      show('Email verified', 'success');
      router.replace('/');
    } catch {
      show('Invalid code. Use 123456 in demo.', 'error');
    }
  };

  return (
    <AuthScreen title="Verify email" subtitle={`Code sent to ${email}`} onBack={() => router.back()}>
      <Text style={styles.hint}>Enter the 6-digit OTP (demo: 123456)</Text>
      <Controller control={control} name="otp" render={({ field, fieldState }) => (
        <Input label="Verification code" keyboardType="number-pad" maxLength={6} {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Verify" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, marginBottom: spacing[2] },
});
