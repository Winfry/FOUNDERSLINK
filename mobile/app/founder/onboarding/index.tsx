import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { Button, Input, MultiSelect, Select, Textarea } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { consentService, founderService, referenceDataService } from '../../../src/services';
import type { BusinessStatus, FounderProfile, Instrument } from '../../../src/types';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderOnboardingScreen() {
  const router = useRouter();
  const { show } = useToast();
  const markComplete = useAuthStore((s) => s.markFounderOnboardingComplete);
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [profile, setProfile] = useState<Partial<FounderProfile>>({
    journeyType: 'startup',
    instruments: ['equity'],
    alreadyHave: [],
    hasEmployees: false,
    handlesPersonalData: false,
  });
  const [consents, setConsents] = useState({ profile_visibility: false, ai_matching: false, contact: false });
  const [meta, setMeta] = useState<Record<string, string[]>>({});
  // What to show for each option id. The mock sends none, so ids are tidied up instead.
  const [labels, setLabels] = useState<Record<string, string>>({});
  const labelOf = (id: string) => labels[id] ?? id.replace(/_/g, ' ');
  const [saving, setSaving] = useState(false);

  const loadMeta = async () => {
    const m = await referenceDataService.getMetaOptions();
    setMeta(m as Record<string, string[]>);
    setLabels((m.labels as Record<string, string>) ?? {});
  };

  const extract = async () => {
    setSaving(true);
    try {
      await loadMeta();
      const suggested = await founderService.extractProfileFromText(description, 'en');
      setProfile((p) => ({ ...p, ...suggested, description }));
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      const saved = await founderService.saveProfile(profile as FounderProfile);
      for (const [purpose, granted] of Object.entries(consents)) {
        await consentService.set(purpose as keyof typeof consents, granted);
      }
      await markComplete();
      show(`Profile ${saved.profileCompleteness}% complete`, 'success');
      router.replace('/(founder)/(tabs)/matches');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Header title="Founder onboarding" subtitle={`Step ${step} of 3`} />
      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 ? (
          <>
            <Textarea
              label="Tell us about your business in your own words. English, Swahili or Sheng is fine."
              value={description}
              onChangeText={setDescription}
            />
            <Button title="Suggest fields" loading={saving} onPress={() => void extract()} />
            <Button title="Fill it in myself" variant="secondary" onPress={() => { void loadMeta(); setStep(2); }} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Input label="Business name" value={String(profile.businessName ?? '')} onChangeText={(t) => setProfile((p) => ({ ...p, businessName: t }))} />
            <Select label="Sector" options={(meta.sectors ?? []).map((s) => ({ label: labelOf(s), value: s }))} value={String(profile.sector ?? '')} onChange={(v) => setProfile((p) => ({ ...p, sector: v }))} />
            <Select label="Stage" options={(meta.stages ?? []).map((s) => ({ label: labelOf(s), value: s }))} value={String(profile.stage ?? '')} onChange={(v) => setProfile((p) => ({ ...p, stage: v as FounderProfile['stage'] }))} />
            <Select label="County" options={(meta.counties ?? []).map((c) => ({ label: c, value: c }))} value={String(profile.county ?? '')} onChange={(v) => setProfile((p) => ({ ...p, county: v }))} />
            <Textarea label="Description" value={String(profile.description ?? '')} onChangeText={(t) => setProfile((p) => ({ ...p, description: t }))} />
            <Input label="Funding amount needed (KES)" keyboardType="number-pad" value={String(profile.fundingAmountKes ?? '')} onChangeText={(t) => setProfile((p) => ({ ...p, fundingAmountKes: Number(t) || 0 }))} />
            <Select label="Business status" options={(meta.businessStatuses ?? []).map((s) => ({ label: labelOf(s), value: s }))} value={String(profile.businessStatus ?? '')} onChange={(v) => setProfile((p) => ({ ...p, businessStatus: v as BusinessStatus }))} />
            <MultiSelect label="Instruments" labels={Object.fromEntries(['equity', 'convertible_note', 'loan'].map((i) => [i, labelOf(i)]))} options={['equity', 'convertible_note', 'loan']} values={(profile.instruments as string[]) ?? []} onChange={(v) => setProfile((p) => ({ ...p, instruments: v as Instrument[] }))} />
            <MultiSelect label="What you already have" labels={Object.fromEntries((meta.complianceItems ?? []).map((i) => [i, labelOf(i)]))} options={meta.complianceItems ?? []} values={profile.alreadyHave ?? []} onChange={(v) => setProfile((p) => ({ ...p, alreadyHave: v }))} />
            <Text style={styles.completeness}>Profile completeness will update after you save.</Text>
            <Button title="Continue to consents" onPress={() => setStep(3)} />
          </>
        ) : null}
        {step === 3 ? (
          <>
            {(
              [
                ['profile_visibility', 'Let verified investors and members see my profile'],
                ['ai_matching', 'Use my business details to match me with investors'],
                ['contact', 'Contact me by SMS or WhatsApp'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={styles.consentRow}>
                <Text style={styles.consentLabel}>{label}</Text>
                <Button
                  title={consents[key] ? 'On' : 'Off'}
                  variant={consents[key] ? 'primary' : 'secondary'}
                  onPress={() => setConsents((c) => ({ ...c, [key]: !c[key] }))}
                />
              </View>
            ))}
            <Button title="Finish onboarding" loading={saving} onPress={() => void finish()} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[3], paddingBottom: spacing[6], gap: spacing[2] },
  completeness: { color: colors.textMuted, fontSize: 13 },
  consentRow: { gap: spacing[1], marginBottom: spacing[2] },
  consentLabel: { color: colors.text, lineHeight: 20 },
});
