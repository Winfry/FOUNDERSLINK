import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Button, Input, PasswordInput, Select } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { signupSchema } from '../../src/lib/auth-schemas';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof signupSchema>;

const ROLES = [
  { label: 'Founder', value: 'founder' },
  { label: 'Investor', value: 'investor' },
  { label: 'Expert', value: 'expert' },
];

export default function SignupScreen() {
  const router = useRouter();
  const { show } = useToast();
  const signup = useAuthStore((s) => s.signup);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', role: 'founder', acceptTerms: false },
  });

  const password = watch('password');

  const onSubmit = async (data: Form) => {
    try {
      await signup({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
        acceptTerms: data.acceptTerms,
      });
      router.replace('/auth/verify-email');
    } catch (e: unknown) {
      show((e as { message?: string })?.message ?? 'Sign up failed', 'error');
    }
  };

  return (
    <AuthScreen title="Create account" subtitle="Join in about two minutes" onBack={() => router.back()}>
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Full name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.fullName?.message} />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} />
        )}
      />
      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <Select label="Role" options={ROLES} value={value} onChange={onChange} />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput label="Password" showStrength onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput label="Confirm password" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.confirmPassword?.message} />
        )}
      />
      {password.length > 0 ? <Text style={styles.hint}>Use at least 8 characters with letters and numbers.</Text> : null}
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Pressable style={styles.checkRow} onPress={() => onChange(!value)}>
            <View style={[styles.box, value && styles.boxOn]} />
            <Text style={styles.checkText}>I accept the Terms and Privacy Policy</Text>
          </Pressable>
        )}
      />
      {errors.acceptTerms ? <Text style={styles.error}>{errors.acceptTerms.message}</Text> : null}
      <Button title="Create account" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Link href="/auth/login" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </Pressable>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing[2] },
  checkRow: { flexDirection: 'row', gap: spacing[1], marginVertical: spacing[2], alignItems: 'flex-start' },
  box: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginTop: 2 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  error: { color: colors.error, fontSize: 12, marginBottom: spacing[1] },
  link: { marginTop: spacing[3], minHeight: 44, justifyContent: 'center' },
  linkText: { textAlign: 'center', color: colors.primary, fontWeight: '600' },
});
