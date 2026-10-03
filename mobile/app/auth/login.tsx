import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input, PasswordInput } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { loginSchema } from '../../src/lib/auth-schemas';
import { MOBILE_TEST_CREDENTIALS } from '../../src/services/mocks/demo-seed';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { show } = useToast();
  const login = useAuthStore((s) => s.login);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });

  const onSubmit = async (data: Form) => {
    try {
      await login(data.identifier, data.password);
      router.replace('/');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Login failed';
      show(msg, 'error');
    }
  };

  return (
    <AuthScreen title="Log in" subtitle="Use email or Investor User ID" onBack={() => router.back()}>
      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email or User ID"
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.identifier?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            label="Password"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
          />
        )}
      />
      <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.forgot}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>
      <Button title="Log in" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Text style={styles.hint}>
        First login after approval: use your User ID and temporary password, then set a new password.
      </Text>
      <Text style={styles.hint}>
        QA — Founder: {MOBILE_TEST_CREDENTIALS.founder.identifier} / {MOBILE_TEST_CREDENTIALS.founder.password}. Investor:{' '}
        {MOBILE_TEST_CREDENTIALS.investor.identifier} / {MOBILE_TEST_CREDENTIALS.investor.password}.
      </Text>
      <Link href="/founder-application" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>Founder? Apply to join</Text>
        </Pressable>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginBottom: spacing[2], minHeight: 44, justifyContent: 'center' },
  forgotText: { color: colors.primary, fontWeight: '600' },
  hint: { marginTop: spacing[2], fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  bold: { fontWeight: '700', color: colors.text },
  link: { marginTop: spacing[3], minHeight: 44, justifyContent: 'center' },
  linkText: { textAlign: 'center', color: colors.primary, fontWeight: '600' },
});
