import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Badge, Button, Input } from '../../src/components/ui';
import { founderApplicationService } from '../../src/services';
import { colors, spacing } from '../../src/theme/tokens';

const schema = z.object({
  email: z.string().email(),
  referenceNumber: z.string().min(5),
});

type Form = z.infer<typeof schema>;

export default function FounderApplicationStatusScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', referenceNumber: '' },
  });
  const [result, setResult] = useState<Awaited<ReturnType<typeof founderApplicationService.checkStatus>> | null>(null);

  const onSubmit = async (data: Form) => {
    setResult(await founderApplicationService.checkStatus(data.email, data.referenceNumber));
  };

  return (
    <AuthScreen title="Founder application status" onBack={() => router.back()}>
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Input label="Email" autoCapitalize="none" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="referenceNumber" render={({ field, fieldState }) => (
        <Input label="Reference number" autoCapitalize="characters" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Check status" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      {result ? (
        <View style={styles.result}>
          <Badge label={result.status.replace(/_/g, ' ')} variant={result.status === 'approved' ? 'success' : result.status === 'rejected' ? 'error' : 'warning'} />
          {result.reason ? <Text style={styles.body}>Reason: {result.reason}</Text> : null}
          {result.status === 'approved' ? (
            <Button title="Log in" onPress={() => router.push('/auth/login')} style={styles.mt} />
          ) : null}
        </View>
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  result: { marginTop: spacing[3], gap: spacing[1] },
  body: { color: colors.text, lineHeight: 20 },
  mt: { marginTop: spacing[2] },
});
