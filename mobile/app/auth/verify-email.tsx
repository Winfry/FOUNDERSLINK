import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { AuthShell } from '../../src/components/auth/AuthShell';
import { CodeInput, TextLink } from '../../src/components/auth/parts';
import { Button } from '../../src/components/ui';
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
    setError,
    formState: { isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  const onSubmit = async (data: Form) => {
    try {
      await authService.verifyEmailOtp(data.otp);
      await markEmailVerified();
      show('Email verified', 'success');
      router.replace('/');
    } catch (e: unknown) {
      setError('otp', {
        message: (e as { message?: string })?.message ?? 'That code is not right. Check it, or send a new one.',
      });
    }
  };

  const resend = async () => {
    try {
      await authService.resendEmailCode();
      show('We sent a new code', 'success');
    } catch (e: unknown) {
      show((e as { message?: string })?.message ?? 'We could not send a new code. Try again in a minute.', 'error');
    }
  };

  return (
    <AuthShell
      title="Check your email"
      helper={
        <>
          We sent a six-digit code to <Text style={styles.email}>{user?.email ?? 'your email'}</Text>. Enter it here to confirm the address is yours.
        </>
      }
    >
      <Controller
        control={control}
        name="otp"
        render={({ field, fieldState }) => (
          <CodeInput label="Six-digit code" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <View style={styles.resend}>
        <Text style={styles.quiet}>No email yet?</Text>
        <TextLink title="Send the code again" onPress={() => void resend()} />
      </View>
      <View style={styles.actions}>
        <Button title="Verify email" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
        <Button title="Continue exploring" variant="secondary" onPress={() => router.replace('/')} />
      </View>
      <Text style={styles.note}>
        You can look around without the code. You will need a verified email before you can connect with anyone.
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  email: { fontSize: 16, fontWeight: '700', color: colors.text },
  resend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing[1], marginTop: -spacing[1] },
  quiet: { fontSize: 16, color: colors.textMuted },
  actions: { marginTop: spacing[3], gap: spacing[1.5] },
  note: { fontSize: 14, color: colors.textMuted, marginTop: spacing[2], textAlign: 'center' },
});
