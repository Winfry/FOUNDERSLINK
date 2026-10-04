import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../../src/components/ui/Text';
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
  const router = useRouter();
  const { show } = useToast();
  const user = useAuthStore((s) => s.user);
  const markEmailVerified = useAuthStore((s) => s.markEmailVerified);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  const onSubmit = async (data: Form) => {
    try {
      await authService.verifyEmailOtp(data.otp);
      await markEmailVerified();
      show('Email verified', 'success');
      router.replace('/');
    } catch {
      show('That code is not right. Demo code: 123456', 'error');
    }
  };

  const resend = async () => {
    try {
      await authService.resendEmailCode();
      show('Code sent again', 'success');
    } catch {
      show('Could not resend code', 'error');
    }
  };

  return (
    <AuthScreen title="Verify email" subtitle={`Code sent to ${user?.email ?? 'your email'}`}>
      <Text style={styles.hint}>You can keep exploring the app. Verification to connect needs a verified email.</Text>
      <Controller
        control={control}
        name="otp"
        render={({ field, fieldState }) => (
          <Input label="Verification code" keyboardType="number-pad" maxLength={6} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Button title="Verify email" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Pressable onPress={() => void resend()} style={styles.link}>
        <Text style={styles.linkText}>Resend code</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/')} style={styles.link}>
        <Text style={styles.linkText}>Continue exploring</Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, marginBottom: spacing[2], lineHeight: 20 },
  link: { marginTop: spacing[2], minHeight: 44, justifyContent: 'center' },
  linkText: { textAlign: 'center', color: colors.primary, fontWeight: '600' },
});
