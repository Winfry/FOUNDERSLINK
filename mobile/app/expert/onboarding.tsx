import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BookOpen, Calculator, Scale } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChoiceCards, FormError, type Choice } from '../../src/components/auth/parts';
import { Button, Input, Textarea } from '../../src/components/ui';
import { Text } from '../../src/components/ui/Text';
import { API_URL, put } from '../../src/services/http/client';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';

const PROFESSIONS: Choice[] = [
  { value: 'lawyer', title: 'Lawyer', line: 'Agreements, incorporation, contracts.', icon: Scale },
  { value: 'accountant', title: 'Accountant', line: 'Tax, eTIMS, bookkeeping.', icon: Calculator },
  { value: 'mentor', title: 'Mentor', line: 'Product, pitch, fundraising.', icon: BookOpen },
];

// The register a profession is checked against (TEAM_DECISIONS D12).
const REGISTER: Record<string, string | undefined> = { lawyer: 'LSK', accountant: 'ICPAK' };

export default function ExpertOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const patchUser = useAuthStore((s) => s.patchUser);
  const [profession, setProfession] = useState('lawyer');
  const [organisation, setOrganisation] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [bio, setBio] = useState('');
  const [services, setServices] = useState('');
  const [sessions, setSessions] = useState('3');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const register = REGISTER[profession];

  const save = async () => {
    setError(null);
    if (bio.trim().length < 10) {
      setError('Say in a sentence or two how you help founders.');
      return;
    }
    const perMonth = Number(sessions);
    if (!Number.isInteger(perMonth) || perMonth < 0 || perMonth > 40) {
      setError('Free sessions a month must be a whole number from 0 to 40.');
      return;
    }
    setSaving(true);
    try {
      // Without a backend (the mock app) there is nothing to save to.
      if (API_URL) {
        await put('/me/expert-profile', {
          profession,
          organisation_name: organisation.trim() || undefined,
          register_body: register,
          register_number: register && registerNumber.trim() ? registerNumber.trim() : undefined,
          bio: bio.trim(),
          services: services
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length >= 2)
            .slice(0, 10),
          office_hours_per_month: perMonth,
        });
      }
      await patchUser({ expertOnboardingComplete: true });
      router.replace('/expert/home');
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Your profile could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing[3], paddingBottom: insets.bottom + spacing[4] }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        Your expert profile
      </Text>
      <Text style={styles.lede}>Founders find you by what you do. It takes about two minutes.</Text>

      <ChoiceCards label="I am a" choices={PROFESSIONS} value={profession} onChange={setProfession} />
      <Input label="Firm or organisation (optional)" value={organisation} onChangeText={setOrganisation} placeholder="e.g. Odhiambo & Partners Advocates" />
      {register ? (
        <Input
          label={`${register} number`}
          hint={`We check it against the ${register} register before you are approved.`}
          value={registerNumber}
          onChangeText={setRegisterNumber}
          autoCapitalize="characters"
        />
      ) : null}
      <Textarea
        label="How you help founders"
        value={bio}
        onChangeText={setBio}
        placeholder="e.g. I help startups incorporate, draft shareholder agreements and review term sheets."
      />
      <Input
        label="Services (separate with commas)"
        value={services}
        onChangeText={setServices}
        placeholder="e.g. Shareholder agreements, Term sheet review"
      />
      <Input
        label="Free sessions a month"
        hint="Founders can book up to this many sessions with you each month."
        value={sessions}
        onChangeText={setSessions}
        keyboardType="number-pad"
      />

      <View style={styles.action}>
        <FormError message={error} />
        <Button title="Save and continue" loading={saving} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  wrap: { paddingHorizontal: spacing[3], gap: spacing[2] },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  lede: { fontSize: 16, color: colors.textMuted, marginBottom: spacing[1] },
  action: { marginTop: spacing[2], gap: spacing[1] },
});
