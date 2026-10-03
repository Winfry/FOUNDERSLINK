import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../../src/components/layout/Header';
import {
  Button,
  FileUploader,
  Input,
  MultiSelect,
  Select,
  StepProgress,
  Textarea,
} from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { founderService } from '../../../src/services';
import { BUSINESS_SECTORS, KENYAN_COUNTIES, PROJECT_TYPES } from '../../../src/services/mocks/kenya-data';
import { useAuthStore } from '../../../src/stores/authStore';
import { useOnboardingStore } from '../../../src/stores/onboardingStore';
import { colors, spacing } from '../../../src/theme/tokens';

const DOC_TYPES = [
  'Certificate of Incorporation (BRS)',
  'CR12',
  'KRA PIN certificate',
  'Tax Compliance Certificate',
  'Single Business Permit',
  'Director ID/Passport',
];

const STAGES = [
  { label: 'Idea', value: 'idea' },
  { label: 'MVP', value: 'mvp' },
  { label: 'Early revenue', value: 'early_revenue' },
  { label: 'Growth', value: 'growth' },
];

export default function FounderOnboardingScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { founderStep, founderData, setFounder, clearFounder } = useOnboardingStore();
  const markComplete = useAuthStore((s) => s.markFounderOnboardingComplete);
  const [step, setStep] = useState(founderStep);
  const [data, setData] = useState<Record<string, unknown>>(founderData);
  const [saving, setSaving] = useState(false);

  const merge = (patch: Record<string, unknown>) => setData((d) => ({ ...d, ...patch }));

  const saveLater = async () => {
    setFounder(step, data);
    await founderService.saveOnboardingStep(step, data);
    show('Progress saved', 'success');
    router.replace('/welcome');
  };

  const next = async () => {
    if (step < 5) {
      const ns = step + 1;
      setStep(ns);
      setFounder(ns, data);
      return;
    }
    setSaving(true);
    try {
      await founderService.saveOnboardingStep(5, { ...data, onboardingComplete: true });
      await markComplete();
      clearFounder();
      show('Profile submitted', 'success');
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Header title="Founder onboarding" subtitle="Complete your profile for investors" />
      <ScrollView contentContainerStyle={styles.content}>
        <StepProgress
          current={step}
          total={5}
          labels={['Business', 'Documents', 'Funding', 'Tags', 'Review']}
        />
        {step === 1 && (
          <>
            <Input label="Business name" value={String(data.businessName ?? '')} onChangeText={(t) => merge({ businessName: t })} />
            <Select label="Sector" options={BUSINESS_SECTORS.map((s) => ({ label: s.label, value: s.id }))} value={String(data.sectorId ?? '')} onChange={(v) => merge({ sectorId: v })} />
            <Select label="Stage" options={STAGES} value={String(data.stage ?? '')} onChange={(v) => merge({ stage: v })} />
            <Select label="County" options={KENYAN_COUNTIES.map((c) => ({ label: c.name, value: c.name }))} value={String(data.county ?? '')} onChange={(v) => merge({ county: v })} />
            <Input label="Year started" keyboardType="number-pad" value={String(data.yearStarted ?? '')} onChangeText={(t) => merge({ yearStarted: t })} />
            <Textarea label="Short description" value={String(data.description ?? '')} onChangeText={(t) => merge({ description: t })} />
            <Input label="Website" autoCapitalize="none" value={String(data.website ?? '')} onChangeText={(t) => merge({ website: t })} />
          </>
        )}
        {step === 2 && (
          <>
            <Text style={styles.section}>Legal & compliance (upload or mark as pending)</Text>
            {DOC_TYPES.map((label) => (
              <View key={label} style={styles.docBlock}>
                <Text style={styles.docLabel}>{label}</Text>
                <FileUploader label="Upload" onChange={() => merge({ [label]: 'uploaded' })} />
                <Button title="I don't have this yet" variant="ghost" onPress={() => merge({ [`${label}_note`]: 'Pending' })} />
              </View>
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <Input label="Amount already raised / own contribution (KES)" keyboardType="number-pad" value={String(data.raised ?? '')} onChangeText={(t) => merge({ raised: t })} />
            <Input label="Total funding needed (KES)" keyboardType="number-pad" value={String(data.target ?? '')} onChangeText={(t) => merge({ target: t })} />
            <Input label="Minimum investment ticket (KES)" keyboardType="number-pad" value={String(data.minTicket ?? '')} onChangeText={(t) => merge({ minTicket: t })} />
            <Input label="Equity / offer (%)" value={String(data.equity ?? '')} onChangeText={(t) => merge({ equity: t })} />
            <Textarea label="Intended use of funds" value={String(data.useOfFunds ?? '')} onChangeText={(t) => merge({ useOfFunds: t })} />
          </>
        )}
        {step === 4 && (
          <MultiSelect label="Project type tags" options={PROJECT_TYPES} values={(data.projectTypes as string[]) ?? []} onChange={(v) => merge({ projectTypes: v })} />
        )}
        {step === 5 && (
          <View style={styles.review}>
            <Text style={styles.reviewTitle}>Review</Text>
            <Text style={styles.reviewLine}>Business: {String(data.businessName ?? '—')}</Text>
            <Text style={styles.reviewLine}>County: {String(data.county ?? '—')}</Text>
            <Text style={styles.reviewLine}>Funding target: KES {String(data.target ?? '—')}</Text>
            <Text style={styles.reviewHint}>Submitting sends your profile for document review.</Text>
          </View>
        )}
        <View style={styles.actions}>
          <Button title="Save and continue later" variant="secondary" onPress={saveLater} />
          {step > 1 ? <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} /> : null}
          <Button title={step === 5 ? 'Submit profile' : 'Continue'} loading={saving} onPress={next} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[3], paddingBottom: spacing[6] },
  section: { fontWeight: '600', marginBottom: spacing[2], color: colors.text },
  docBlock: { marginBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing[2] },
  docLabel: { fontWeight: '600', marginBottom: spacing[1], color: colors.text },
  review: { gap: spacing[1] },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  reviewLine: { color: colors.text, fontSize: 15 },
  reviewHint: { color: colors.textMuted, marginTop: spacing[2] },
  actions: { gap: spacing[2], marginTop: spacing[3] },
});
