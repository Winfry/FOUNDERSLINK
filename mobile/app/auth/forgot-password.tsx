import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { AuthShell } from '../../src/components/auth/AuthShell';
import { FormError } from '../../src/components/auth/parts';
import { Button, Input } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { forgotEmailSchema } from '../../src/lib/auth-schemas';
import { authService } from '../../src/services';
import { spacing } from '../../src/theme/tokens';
import type { z } from 'zod';

type Form = z.infer<typeof forgotEmailSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [refused, setRefused] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: Form) => {
    setRefused(null);
    try {
      await authService.requestPasswordReset(data.email);
      show('If an account exists, we sent a code.', 'success');
      router.push({ pathname: '/auth/reset-password', params: { email: data.email } });
    } catch (e: unknown) {
      setRefused((e as { message?: string })?.message ?? 'We could not send the code. Check your connection and try again.');
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      helper="Enter your email and we will send you a code to set a new one."
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/auth/login'))}
    >
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Input
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          {...field}
          onChangeText={field.onChange}
          error={fieldState.error?.message}
        />
      )} />
      <View style={styles.action}>
        <FormError message={refused} />
        <Button title="Send code" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing[2] },
});
