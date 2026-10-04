import { useRouter } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Switch } from '../../../src/components/ui/Switch';
import { Sparkles } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { AmountField, Checkbox, FormError, LongSelect, Steps, SuggestedTag } from '../../../src/components/auth/parts';
import { Button, Input, MultiSelect, Select, Textarea } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { consentService, founderService, referenceDataService } from '../../../src/services';
import type { BusinessStatus, FounderProfile, Instrument } from '../../../src/types';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';

const STEP_NAMES = ['Describe', 'Confirm', 'Consent'];

const EXAMPLES = [
  'We run a booking app for small clinics in Nairobi. We have 300 paying users and need KSh 2 million to grow.',
  'Tunatengeneza app ya kubook clinic visits Nairobi, tunahitaji milioni moja.',
];

const INSTRUMENTS = ['equity', 'convertible_note', 'loan'];

const CONSENTS = [
  ['profile_visibility', 'Show my profile', 'Verified investors and members can see your business profile.'],
  ['ai_matching', 'Match me with investors', 'Your business details are used to suggest investors who fit.'],
  ['contact', 'Contact me', 'FounderLink can reach you by SMS or WhatsApp.'],
] as const;

// The fields step 2 will not continue without, in the order they appear, and what to call each.
const REQUIRED: [keyof FounderProfile, string, string][] = [
  ['description', 'Description', 'Describe your business in at least a sentence.'],
  ['sector', 'Sector', 'Choose the sector your business is in.'],
  ['stage', 'Stage', 'Choose the stage your business is at.'],
  ['county', 'County', 'Choose the county you work from.'],
  ['businessStatus', 'Business status', 'Choose how your business is registered.'],
];

const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message ?? fallback;

export default function FounderOnboardingScreen() {
  const router = useRouter();
  const { show } = useToast();
  const markComplete = useAuthStore((s) => s.markFounderOnboardingComplete);
  const scroll = useRef<ScrollView>(null);
  const [step, setStepState] = useState(1);
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
  const labelOf = (id: string) => {
    const words = labels[id] ?? id.replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
  const [saving, setSaving] = useState(false);
  // The fields "Suggest fields" filled in, until she changes them herself.
  const [suggested, setSuggested] = useState<string[]>([]);
  // null until she has asked for suggestions.
  const [suggestedCount, setSuggestedCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string | null>(null);

  const setStep = (n: number) => {
    setFailed(null);
    setStepState(n);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  // Her own edit to a field clears its error and its "Suggested" mark.
  const change = (patch: Partial<FounderProfile>) => {
    const keys = Object.keys(patch);
    setProfile((p) => ({ ...p, ...patch }));
    setSuggested((s) => s.filter((k) => !keys.includes(k)));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))));
  };

  const loadMeta = async () => {
    const m = await referenceDataService.getMetaOptions();
    setMeta(m as Record<string, string[]>);
    setLabels((m.labels as Record<string, string>) ?? {});
  };

  const extract = async () => {
    if (description.trim().length < 10) {
      setErrors({ describe: 'Write a sentence or two about your business first.' });
      return;
    }
    setErrors({});
    setFailed(null);
    setSaving(true);
    try {
      await loadMeta();
      const found = await founderService.extractProfileFromText(description, 'en');
      setProfile((p) => ({ ...p, ...found, description }));
      const shown = ['businessName', 'sector', 'stage', 'county', 'fundingAmountKes', 'businessStatus', 'instruments'];
      const keys = Object.keys(found).filter((k) => shown.includes(k));
      setSuggested(keys);
      setSuggestedCount(keys.length);
      setStep(2);
    } catch (e) {
      setFailed(messageOf(e, 'We could not read your description just now. Try again, or fill it in yourself.'));
    } finally {
      setSaving(false);
    }
  };

  const fillMyself = async () => {
    setErrors({});
    if (description.trim()) setProfile((p) => ({ ...p, description: p.description || description }));
    setStep(2);
    try {
      await loadMeta();
    } catch (e) {
      setFailed(messageOf(e, 'We could not load the choices for this form. Check your connection and go back to try again.'));
    }
  };

  const toConsents = () => {
    const missing: Record<string, string> = {};
    for (const [key, , message] of REQUIRED) {
      const value = profile[key];
      if (!value || (key === 'description' && String(value).trim().length < 10)) missing[key] = message;
    }
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;
    setStep(3);
  };

  const finish = async () => {
    setFailed(null);
    setSaving(true);
    try {
      const saved = await founderService.saveProfile(profile as FounderProfile);
      for (const [purpose, granted] of Object.entries(consents)) {
        await consentService.set(purpose as keyof typeof consents, granted);
      }
      await markComplete();
      show(`Profile ${saved.profileCompleteness}% complete`, 'success');
      router.replace('/(founder)/(tabs)/matches');
    } catch (e) {
      setFailed(messageOf(e, 'We could not save your profile. Check your connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const options = (ids: string[] | undefined) => (ids ?? []).map((s) => ({ label: labelOf(s), value: s }));
  const field = (key: string, child: ReactNode) => (
    <View>
      {child}
      {suggested.includes(key) ? <SuggestedTag /> : null}
    </View>
  );
  const missingNames = REQUIRED.filter(([key]) => errors[key]).map(([, name]) => name);

  return (
    <View style={styles.flex}>
      <Header title="Set up your profile" onBack={step > 1 ? () => setStep(step - 1) : undefined} />
      <View style={styles.steps}>
        <Steps names={STEP_NAMES} current={step} />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <Text style={styles.heading}>Tell us about your business</Text>
            <Text style={styles.helper}>
              Write it the way you would say it. English, Swahili or Sheng is fine. We will suggest your profile fields from it.
            </Text>
            <View style={styles.section}>
              <Textarea
                label="Your business, in your own words"
                placeholder="What you do, where, and how much you want to raise"
                value={description}
                onChangeText={(t) => {
                  setDescription(t);
                  if (errors.describe) setErrors({});
                }}
                error={errors.describe}
                style={[styles.heroBox, errors.describe ? { borderColor: colors.error } : null]}
              />
              <Text style={styles.small}>Not sure how to start? Tap an example and edit it.</Text>
              <View style={styles.examples}>
                {EXAMPLES.map((example) => (
                  <Pressable
                    key={example}
                    onPress={() => {
                      setDescription(example);
                      setErrors({});
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Use this example: ${example}`}
                    style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
                  >
                    <Text style={styles.exampleText}>{example}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.actions}>
              <FormError message={failed} />
              <Button title="Suggest fields" loading={saving} onPress={() => void extract()} />
              <Button title="Fill it in myself" variant="ghost" onPress={() => void fillMyself()} />
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.heading}>Check your details</Text>
            <Text style={styles.helper}>Investors are matched to you on these, so make sure they are right.</Text>
            {suggestedCount !== null ? (
              <View style={styles.notice}>
                <Sparkles size={20} color={colors.primaryDark} />
                <Text style={styles.noticeText}>
                  {suggestedCount > 0
                    ? `We filled in ${suggestedCount} ${suggestedCount === 1 ? 'field' : 'fields'} from your description. Check the ones marked "Suggested".`
                    : 'We could not pick out any fields from your description. Please fill them in below.'}
                </Text>
              </View>
            ) : null}
            <FormError message={failed} />

            <View style={styles.section}>
              <Text style={styles.group}>Your business</Text>
              {field('businessName',
                <Input label="Business name" value={String(profile.businessName ?? '')} onChangeText={(t) => change({ businessName: t })} />,
              )}
              <Textarea label="Description" value={String(profile.description ?? '')} onChangeText={(t) => change({ description: t })} error={errors.description} />
              {field('sector',
                <Select label="Sector" placeholder="Choose a sector" options={options(meta.sectors)} value={String(profile.sector ?? '')} onChange={(v) => change({ sector: v })} error={errors.sector} />,
              )}
              {field('stage',
                <Select label="Stage" placeholder="Choose a stage" options={options(meta.stages)} value={String(profile.stage ?? '')} onChange={(v) => change({ stage: v as FounderProfile['stage'] })} error={errors.stage} />,
              )}
              {field('county',
                <LongSelect label="County" placeholder="Choose a county" options={meta.counties ?? []} value={String(profile.county ?? '')} onChange={(v) => change({ county: v })} error={errors.county} />,
              )}
              {field('businessStatus',
                <Select label="Business status" placeholder="Choose a status" options={options(meta.businessStatuses)} value={String(profile.businessStatus ?? '')} onChange={(v) => change({ businessStatus: v as BusinessStatus })} error={errors.businessStatus} />,
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.group}>What you need</Text>
              {field('fundingAmountKes',
                <AmountField label="How much you want to raise" hint="Leave it empty if you are not sure yet." value={profile.fundingAmountKes} onChange={(n) => change({ fundingAmountKes: n })} />,
              )}
              {field('instruments',
                <MultiSelect label="How you would take the money" labels={Object.fromEntries(INSTRUMENTS.map((i) => [i, labelOf(i)]))} options={INSTRUMENTS} values={(profile.instruments as string[]) ?? []} onChange={(v) => change({ instruments: v as Instrument[] })} />,
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.group}>What you already have</Text>
              <Text style={styles.small}>Tick everything that is already in place. It is fine if nothing is yet.</Text>
              <View style={styles.haves}>
                {(meta.complianceItems ?? []).map((item) => {
                  const have = (profile.alreadyHave ?? []).includes(item);
                  return (
                    <Checkbox
                      key={item}
                      checked={have}
                      onChange={(on) =>
                        change({ alreadyHave: on ? [...(profile.alreadyHave ?? []), item] : (profile.alreadyHave ?? []).filter((i) => i !== item) })
                      }
                    >
                      {labelOf(item)}
                    </Checkbox>
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <FormError message={missingNames.length > 0 ? `Still needed: ${missingNames.join(', ')}. Scroll up to fill ${missingNames.length === 1 ? 'it' : 'them'} in.` : null} />
              <Button title="Continue" onPress={toConsents} />
              <Button title="Back" variant="ghost" onPress={() => setStep(1)} />
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.heading}>You decide what is shared</Text>
            <Text style={styles.helper}>Everything is off until you turn it on.</Text>
            <View style={styles.consents}>
              {CONSENTS.map(([key, title, line]) => (
                <Pressable
                  key={key}
                  style={[styles.consent, consents[key] && styles.consentOn]}
                  onPress={() => setConsents((c) => ({ ...c, [key]: !c[key] }))}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: consents[key] }}
                  accessibilityLabel={`${title}. ${line}`}
                >
                  <View style={styles.consentWords}>
                    <Text style={styles.consentTitle}>{title}</Text>
                    <Text style={styles.consentLine}>{line}</Text>
                  </View>
                  <Switch
                    value={consents[key]}
                    onValueChange={(on) => setConsents((c) => ({ ...c, [key]: on }))}
                  />
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <FormError message={failed} />
              <Button title="Finish" loading={saving} onPress={() => void finish()} />
              <Button title="Back" variant="ghost" onPress={() => setStep(2)} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  steps: { paddingHorizontal: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[1.5], borderBottomWidth: 1, borderBottomColor: colors.border },
  haves: { marginTop: spacing[1] },
  content: { padding: spacing[2], paddingTop: spacing[3], paddingBottom: spacing[6] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  helper: { fontSize: 16, color: colors.textMuted, marginTop: spacing[1] },
  section: { marginTop: spacing[3] },
  group: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing[2] },
  heroBox: { minHeight: 168, borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.white },
  small: { fontSize: 14, color: colors.textMuted },
  examples: { gap: spacing[1], marginTop: spacing[1] },
  example: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    borderRadius: radius.card,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[1.5],
  },
  examplePressed: { opacity: 0.7 },
  exampleText: { fontSize: 14, color: colors.primaryDark },
  notice: {
    flexDirection: 'row',
    gap: spacing[1],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.card,
    padding: spacing[1.5],
    marginTop: spacing[2],
  },
  noticeText: { flex: 1, fontSize: 14, color: colors.primaryDark },
  actions: { marginTop: spacing[4], gap: spacing[1] },
  consents: { marginTop: spacing[3], gap: spacing[1.5] },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing[2],
    backgroundColor: colors.white,
  },
  consentOn: { borderColor: colors.primary },
  consentWords: { flex: 1 },
  consentTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  consentLine: { fontSize: 14, color: colors.textMuted, marginTop: spacing[0.5] },
});
