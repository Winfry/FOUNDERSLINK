import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { Button, Input, MultiSelect, Select, StepProgress, Textarea } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { investorService } from '../../../src/services';
import { BUSINESS_SECTORS, KENYAN_COUNTIES, PROJECT_TYPES } from '../../../src/services/mocks/kenya-data';
import { useAuthStore } from '../../../src/stores/authStore';
import { useOnboardingStore } from '../../../src/stores/onboardingStore';
import { colors, spacing } from '../../../src/theme/tokens';

const GOALS = ['Equity', 'Profit share', 'Partnership / advisory', 'Other'];
const STAGES = ['idea', 'mvp', 'early_revenue', 'growth'];
const INVOLVEMENT = [
  { label: 'Passive', value: 'passive' },
  { label: 'Active', value: 'active' },
];

export default function InvestorOnboardingScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { investorMatchStep, investorMatchData, setInvestorMatch, clearInvestorApp } = useOnboardingStore();
  const markComplete = useAuthStore((s) => s.markInvestorOnboardingComplete);
  const [step, setStep] = useState(investorMatchStep);
  const [data, setData] = useState<Record<string, unknown>>(investorMatchData);
  const [loading, setLoading] = useState(false);

  const merge = (patch: Record<string, unknown>) => setData((d) => ({ ...d, ...patch }));

  const finish = async () => {
    setLoading(true);
    try {
      await investorService.saveMatchingQuestionnaire(data);
      await markComplete();
      setInvestorMatch(4, data);
      show('Preferences saved', 'success');
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Header title="Matching questionnaire" subtitle="Help us recommend relevant founders" />
      <ScrollView contentContainerStyle={styles.content}>
        <StepProgress current={step} total={4} labels={['Goals', 'Focus', 'Ticket', 'Bio']} />
        {step === 1 && (
          <MultiSelect label="Investment goals" options={GOALS} values={(data.goals as string[]) ?? []} onChange={(v) => merge({ goals: v })} />
        )}
        {step === 2 && (
          <>
            <MultiSelect label="Project types" options={PROJECT_TYPES} values={(data.projectTypes as string[]) ?? []} onChange={(v) => merge({ projectTypes: v })} />
            <MultiSelect label="Sectors" options={BUSINESS_SECTORS.map((s) => s.label)} values={(data.sectors as string[]) ?? []} onChange={(v) => merge({ sectors: v })} />
            <MultiSelect label="Stages" options={STAGES} values={(data.stages as string[]) ?? []} onChange={(v) => merge({ stages: v })} />
            <MultiSelect label="Counties / regions" options={KENYAN_COUNTIES.map((c) => c.name)} values={(data.counties as string[]) ?? []} onChange={(v) => merge({ counties: v })} />
          </>
        )}
        {step === 3 && (
          <>
            <Input label="Minimum ticket (KES)" keyboardType="number-pad" value={String(data.ticketMin ?? '')} onChangeText={(t) => merge({ ticketMin: t })} />
            <Input label="Maximum ticket (KES)" keyboardType="number-pad" value={String(data.ticketMax ?? '')} onChangeText={(t) => merge({ ticketMax: t })} />
            <Input label="Investment horizon (years)" keyboardType="number-pad" value={String(data.horizon ?? '')} onChangeText={(t) => merge({ horizon: t })} />
            <Select label="Involvement" options={INVOLVEMENT} value={String(data.involvement ?? '')} onChange={(v) => merge({ involvement: v })} />
          </>
        )}
        {step === 4 && (
          <Textarea label="Short bio — value beyond capital" value={String(data.bio ?? '')} onChangeText={(t) => merge({ bio: t })} />
        )}
        <View style={styles.actions}>
          {step > 1 ? <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} /> : null}
          {step < 4 ? (
            <Button title="Continue" onPress={() => { const ns = step + 1; setStep(ns); setInvestorMatch(ns, data); }} />
          ) : (
            <Button title="Finish" loading={loading} onPress={finish} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[3] },
  actions: { gap: spacing[2], marginTop: spacing[3] },
});
