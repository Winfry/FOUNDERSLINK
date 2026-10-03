import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button, FileUploader, Input, Select, StepProgress, Textarea } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { founderApplicationService } from '../../src/services';
import { BUSINESS_SECTORS, KENYAN_COUNTIES } from '../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../src/theme/tokens';

const STAGES = [
  { label: 'Idea', value: 'idea' },
  { label: 'MVP', value: 'mvp' },
  { label: 'Early revenue', value: 'early_revenue' },
  { label: 'Growth', value: 'growth' },
];

export default function FounderApplicationScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const merge = (p: Record<string, unknown>) => setData((d) => ({ ...d, ...p }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await founderApplicationService.submit(data);
      router.replace({ pathname: '/founder-application/confirmation', params: { ref: res.referenceNumber } });
    } catch (e: unknown) {
      show((e as { message?: string })?.message ?? 'Could not submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Header title="Founder application" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Apply to join FounderLink. After review, approved founders receive a User ID and temporary password by email.
        </Text>
        <StepProgress current={step} total={4} labels={['Contact', 'Business', 'Documents', 'Review']} />
        {step === 1 && (
          <>
            <Input label="Full name" value={String(data.fullName ?? '')} onChangeText={(t) => merge({ fullName: t })} />
            <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={String(data.email ?? '')} onChangeText={(t) => merge({ email: t })} hint="One account per email" />
            <Input label="Phone (+254)" value={String(data.phone ?? '+254')} onChangeText={(t) => merge({ phone: t })} />
          </>
        )}
        {step === 2 && (
          <>
            <Input label="Business name" value={String(data.businessName ?? '')} onChangeText={(t) => merge({ businessName: t })} />
            <Select label="Sector" options={BUSINESS_SECTORS.map((s) => ({ label: s.label, value: s.id }))} value={String(data.sectorId ?? '')} onChange={(v) => merge({ sectorId: v })} />
            <Select label="Stage" options={STAGES} value={String(data.stage ?? '')} onChange={(v) => merge({ stage: v })} />
            <Select label="County" options={KENYAN_COUNTIES.map((c) => ({ label: c.name, value: c.name }))} value={String(data.county ?? '')} onChange={(v) => merge({ county: v })} />
            <Textarea label="Business description" value={String(data.description ?? '')} onChangeText={(t) => merge({ description: t })} />
            <Input label="Funding target (KES)" keyboardType="number-pad" value={String(data.fundingTargetKes ?? '')} onChangeText={(t) => merge({ fundingTargetKes: t })} />
          </>
        )}
        {step === 3 && (
          <>
            <FileUploader label="BRS / Business registration" onChange={(f) => f && merge({ documents: [{ id: 'brs', name: f.name, mimeType: f.mimeType }] })} />
            <FileUploader label="KRA PIN certificate" onChange={(f) => f && merge({ kraDoc: f.name })} />
            <FileUploader label="CR12 (optional)" onChange={() => undefined} />
          </>
        )}
        {step === 4 && (
          <View>
            <Text style={styles.reviewTitle}>Review</Text>
            <Text style={styles.reviewLine}>{String(data.fullName)} · {String(data.email)}</Text>
            <Text style={styles.reviewLine}>{String(data.businessName)} · {String(data.county)}</Text>
          </View>
        )}
        <View style={styles.actions}>
          {step > 1 && <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />}
          {step < 4 ? (
            <Button title="Continue" onPress={() => setStep((s) => s + 1)} />
          ) : (
            <Button title="Submit application" loading={submitting} onPress={submit} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[3], paddingBottom: spacing[6] },
  intro: { color: colors.textMuted, marginBottom: spacing[2], lineHeight: 20 },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  reviewLine: { color: colors.text, marginTop: 4 },
  actions: { gap: spacing[2], marginTop: spacing[3] },
});
