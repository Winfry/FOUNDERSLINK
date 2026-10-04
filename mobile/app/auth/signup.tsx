import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Rocket, TrendingUp } from 'lucide-react-native';
import { Text } from '../../src/components/ui/Text';
import { AuthShell } from '../../src/components/auth/AuthShell';
import { Checkbox, ChoiceCards, FormError, PasswordRules, TextLink, type Choice } from '../../src/components/auth/parts';
import { Button, Input, PasswordInput } from '../../src/components/ui';
import { signupSchema } from '../../src/lib/auth-schemas';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof signupSchema>;

const ROLES: Choice[] = [
  { value: 'founder', title: 'Founder', line: 'I am raising money for my business.', icon: Rocket },
  { value: 'investor', title: 'Investor', line: 'I am looking for businesses to back.', icon: TrendingUp },
];

export default function SignupScreen() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const [refused, setRefused] = useState<string | null>(null);
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
    setRefused(null);
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
      setRefused((e as { message?: string })?.message ?? 'We could not create your account. Please try again.');
    }
  };

  return (
    <AuthShell
      title="Create your account"
      helper="It takes about two minutes."
    >
      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <ChoiceCards label="I am joining as" choices={ROLES} value={value} onChange={onChange} />
        )}
      />
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Full name" autoComplete="name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.fullName?.message} />
        )}
      />
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
          <PasswordInput label="Password" showStrength onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
        )}
      />
      <PasswordRules password={password} />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput label="Type the password again" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.confirmPassword?.message} />
        )}
      />
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Checkbox checked={value} onChange={onChange} error={errors.acceptTerms?.message}>
            I accept the Terms and Privacy Policy
          </Checkbox>
        )}
      />
      <View style={styles.action}>
        <FormError message={refused} />
        <Button title="Create account" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
      <View style={styles.switch}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <TextLink title="Log in" onPress={() => router.push('/auth/login')} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing[3] },
  switch: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing[1], marginTop: spacing[2] },
  switchText: { fontSize: 16, color: colors.textMuted },
});
