import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { AuthScreen } from '../../src/components/layout/AuthScreen';
import { Badge, Button, Input } from '../../src/components/ui';
import { investorApplicationService } from '../../src/services';
import { colors, spacing } from '../../src/theme/tokens';

const schema = z.object({
  email: z.string().email(),
  referenceNumber: z.string().min(5),
});

type Form = z.infer<typeof schema>;

export default function ApplicationStatusScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', referenceNumber: '' },
  });
  const [result, setResult] = useState<Awaited<ReturnType<typeof investorApplicationService.checkStatus>> | null>(null);

  const onSubmit = async (data: Form) => {
    const res = await investorApplicationService.checkStatus(data.email, data.referenceNumber);
    setResult(res);
  };

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'warning';

  return (
    <AuthScreen title="Application status" onBack={() => router.back()}>
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Input label="Email used in application" autoCapitalize="none" {...field} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="referenceNumber" render={({ field, fieldState }) => (
        <Input label="Reference number" autoCapitalize="characters" {...field} onChangeText={field.onChange} error={fieldState.error?.message} hint="Try FL-APP-2026-8842 or ending 0001/0002/0003" />
      )} />
      <Button title="Check status" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      {result ? (
        <View style={styles.result}>
          <Badge label={result.status.replace(/_/g, ' ')} variant={statusVariant(result.status)} />
          {result.reason ? <Text style={styles.body}>Reason: {result.reason}</Text> : null}
          {result.message ? <Text style={styles.body}>{result.message}</Text> : null}
        </View>
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  result: { marginTop: spacing[3], gap: spacing[1] },
  body: { color: colors.text, lineHeight: 20 },
});
