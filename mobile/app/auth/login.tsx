import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input, PasswordInput } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { loginSchema } from '../../src/lib/auth-schemas';
import { API_URL } from '../../src/services/http/client';
import { listDemoAccounts, DEMO_PASSWORD } from '../../src/services/mocks/mock-store';
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
  } = useForm<Form>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password);
      router.replace('/');
    } catch (e: unknown) {
      show((e as { message?: string })?.message ?? 'Login failed', 'error');
    }
  };

  return (
    <AuthScreen title="Log in" subtitle="Email and password" onBack={() => router.back()}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput label="Password" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
        )}
      />
      <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.forgot}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>
      <Button title="Log in" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      {/* These accounts exist only in the mock data, so they are hidden when the app uses the backend. */}
      {API_URL ? null : (
        <>
          <Text style={styles.hint}>Demo password for all QA accounts: {DEMO_PASSWORD}</Text>
          {listDemoAccounts().map((a) => (
            <Text key={a.email} style={styles.hint}>
              {a.label}: {a.email}
            </Text>
          ))}
        </>
      )}
      <Link href="/auth/signup" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginBottom: spacing[2], minHeight: 44, justifyContent: 'center' },
  forgotText: { color: colors.primary, fontWeight: '600' },
  hint: { marginTop: spacing[1], fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  link: { marginTop: spacing[3], minHeight: 44, justifyContent: 'center' },
  linkText: { textAlign: 'center', color: colors.primary, fontWeight: '600' },
});
