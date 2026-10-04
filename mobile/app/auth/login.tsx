import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { AuthShell } from '../../src/components/auth/AuthShell';
import { FormError, TextLink } from '../../src/components/auth/parts';
import { Button, Input, PasswordInput } from '../../src/components/ui';
import { loginSchema } from '../../src/lib/auth-schemas';
import { API_URL } from '../../src/services/http/client';
import { listDemoAccounts, DEMO_PASSWORD } from '../../src/services/mocks/mock-store';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  // What the backend said when it refused the login. Shown in the form, where she is looking.
  const [refused, setRefused] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: Form) => {
    setRefused(null);
    try {
      await login(data.email, data.password);
      router.replace('/');
    } catch (e: unknown) {
      setRefused((e as { message?: string })?.message ?? 'We could not log you in. Check your email and password and try again.');
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      helper="Log in with your email and password."
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput label="Password" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
        )}
      />
      <View style={styles.forgot}>
        <TextLink title="Forgot password?" align="right" onPress={() => router.push('/auth/forgot-password')} />
      </View>
      <View style={styles.action}>
        <FormError message={refused} />
        <Button title="Log in" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
      <View style={styles.switch}>
        <Text style={styles.switchText}>New to FounderLink?</Text>
        <TextLink title="Create account" onPress={() => router.push('/auth/signup')} />
      </View>
      {/* These accounts exist only in the mock data, so they are hidden when the app uses the backend. */}
      {API_URL ? null : (
        <View style={styles.demo}>
          <Text style={styles.hint}>Demo password for all QA accounts: {DEMO_PASSWORD}</Text>
          {listDemoAccounts().map((a) => (
            <Text key={a.email} style={styles.hint}>
              {a.label}: {a.email}
            </Text>
          ))}
        </View>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  // The field above already leaves 16 below itself; the link tucks into it.
  forgot: { marginTop: -spacing[1] },
  action: { marginTop: spacing[2] },
  switch: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing[1], marginTop: spacing[2] },
  switchText: { fontSize: 16, color: colors.textMuted },
  demo: { marginTop: spacing[2], gap: spacing[0.5] },
  hint: { fontSize: 12, color: colors.textMuted },
});
