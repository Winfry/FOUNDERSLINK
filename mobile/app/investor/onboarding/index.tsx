import { useRouter } from 'expo-router';
import { KeyboardScroll } from '../../../src/components/ui/KeyboardScroll';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Building2, Rocket, User, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { AmountField, FormError, LongSelect, Steps, TextLink } from '../../../src/components/auth/parts';
import { KindPicker, type KindChoice } from '../../../src/components/investor-setup/KindPicker';
import { Button, Input, MultiSelect, Switch, Textarea } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { consentService, investorService, referenceDataService, type InvestorSetup } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';

const STEP_NAMES = ['Who you invest for', 'What you fund', 'What is shared'];

const SHARED = [
  ['profile_visibility', 'Let verified members see my profile', 'Without this, founders cannot see who is behind your fund.'],
  ['ai_matching', 'Use my details for AI matching', 'Without this, FoundersLink’s own rules match you with founders.'],
] as const;
type Shared = (typeof SHARED)[number][0];
const MANDATE_MIN = 10;

const KINDS: KindChoice[] = [
  { value: 'angel', title: 'Angel investor', line: 'You invest your own money.', icon: User },
  { value: 'vc', title: 'Venture capital fund', line: 'You invest on behalf of a fund.', icon: Building2 },
  { value: 'accelerator', title: 'Accelerator', line: 'You run a programme that backs startups.', icon: Rocket },
];

type Field = 'organisationName' | 'sectors' | 'stages' | 'instruments' | 'ticketMin' | 'ticketMax' | 'mandateText';
type Meta = { sectors: string[]; stages: string[]; instruments: string[]; counties: string[] };

const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message ?? fallback;
const tidy = (id: string) => {
  const s = id.replace(/_/g, ' ');
  return s.toLowerCase() === 'mvp' ? 'MVP' : s.charAt(0).toUpperCase() + s.slice(1);
};

export default function InvestorOnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const scroll = useRef<KeyboardScroll>(null);
  // Arriving from her profile leaves history; being sent here for a first setup does not.
  const [cameFromApp] = useState(() => router.canGoBack());

  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [step, setStepState] = useState(1);
  const [meta, setMeta] = useState<Meta>({ sectors: [], stages: [], instruments: [], counties: [] });
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [organisationName, setOrganisationName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState<string | undefined>(undefined);
  const [kind, setKind] = useState<InvestorSetup['kind']>('angel');
  const [sectors, setSectors] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [ticketMin, setTicketMin] = useState<number | undefined>(undefined);
  const [ticketMax, setTicketMax] = useState<number | undefined>(undefined);
  const [mandateText, setMandateText] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Both off until she turns them on.
  const [shared, setShared] = useState<Record<Shared, boolean>>({ profile_visibility: false, ai_matching: false });
  const [savedShared, setSavedShared] = useState<Partial<Record<Shared, boolean>>>({});

  const labelOf = (id: string) => labels[id] ?? tidy(id);
  const labelMap = (ids: string[]) => Object.fromEntries(ids.map((i) => [i, labelOf(i)]));
  const clear = (field: Field) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFailed(null);
  };
  const setStep = (n: number) => {
    setFailed(null);
    setStepState(n);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const options = (await referenceDataService.getMetaOptions()) as unknown as Meta & { labels?: Record<string, string> };
        if (!alive) return;
        setMeta({
          sectors: options.sectors ?? [],
          stages: options.stages ?? [],
          instruments: options.instruments ?? [],
          counties: options.counties ?? [],
        });
        setLabels(options.labels ?? {});
      } catch (e) {
        if (alive) setFailed(messageOf(e, 'We could not load the choices for this form. Check your connection and try again.'));
      }
      try {
        const setup = await investorService.getSetup();
        if (alive && setup) {
          setEditing(true);
          setOrganisationName(setup.organisationName);
          setJobTitle(setup.jobTitle ?? '');
          setBio(setup.bio);
          setKind(setup.kind);
          setSectors(setup.sectors);
          setStages(setup.stages);
          setInstruments(setup.instruments);
          setCounties(setup.counties);
          setTicketMin(setup.ticketMinKes);
          setTicketMax(setup.ticketMaxKes);
          setMandateText(setup.mandateText);
          // The choices she made before, so editing does not switch them off.
          const given = Object.fromEntries((await consentService.list()).map((c) => [c.purpose, c.granted]));
          if (alive) {
            const before = { profile_visibility: given.profile_visibility ?? false, ai_matching: given.ai_matching ?? false };
            setShared(before);
            setSavedShared(before);
          }
        }
      } catch {
        // No setup yet, or it could not be read: she starts from an empty form.
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const next = () => {
    if (organisationName.trim().length < 2) {
      setErrors({ organisationName: 'Enter the name of the organisation or fund you invest for. If you invest alone, use your own name.' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const toShared = () => {
    const found: Partial<Record<Field, string>> = {};
    if (!sectors.length) found.sectors = 'Choose at least one sector.';
    if (!stages.length) found.stages = 'Choose at least one stage.';
    if (!instruments.length) found.instruments = 'Choose at least one way you invest.';
    if (!ticketMin || ticketMin <= 0) found.ticketMin = 'Enter the smallest amount you invest.';
    if (!ticketMax || ticketMax <= 0) found.ticketMax = 'Enter the largest amount you invest.';
    else if (ticketMin && ticketMin > ticketMax) found.ticketMax = 'The largest amount must be at least the smallest.';
    if (mandateText.trim().length < MANDATE_MIN) found.mandateText = `Write at least ${MANDATE_MIN} characters about what you are looking for.`;
    setErrors(found);
    const missing = Object.values(found).filter(Boolean).length;
    if (missing) {
      setFailed(missing === 1 ? 'One thing above still needs your answer.' : `${missing} things above still need your answer.`);
      return;
    }
    setStep(3);
  };

  const save = async (thenVerify = false) => {
    setFailed(null);
    setSaving(true);
    try {
      await investorService.saveSetup({
        organisationName: organisationName.trim(),
        jobTitle: jobTitle.trim() || undefined,
        bio,
        kind,
        mandateText: mandateText.trim(),
        sectors,
        stages,
        counties,
        instruments,
        ticketMinKes: ticketMin as number,
        ticketMaxKes: ticketMax as number,
      });
      for (const [purpose] of SHARED) {
        // Only what she changed is recorded again.
        if (savedShared[purpose] === shared[purpose]) continue;
        await consentService.set(purpose, shared[purpose]);
      }
      setSavedShared(shared);
      await useAuthStore.getState().markInvestorOnboardingComplete();
      void queryClient.invalidateQueries({ queryKey: ['consents'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-setup'] });
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
      show(editing ? 'What you fund is updated' : 'Saved. Here are founders that fit.', 'success');
      router.replace('/(investor)/(tabs)/discover');
      if (thenVerify) router.push('/founder/verify');
    } catch (e) {
      setFailed(messageOf(e, 'We could not save this. Check your connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const logOut = async () => {
    await useAuthStore.getState().logout();
    router.replace('/auth/login');
  };

  const back = step > 1 ? () => setStep(step - 1) : cameFromApp ? () => router.back() : undefined;
  const written = mandateText.trim().length;
  const countiesLeft = meta.counties.filter((c) => !counties.includes(c));

  return (
    <View style={styles.flex}>
      <Header title="What do you fund?" onBack={back} />
      <View style={styles.steps}>
        <Steps names={STEP_NAMES} current={step} />
      </View>
      {!ready ? (
        <ScreenLoading />
      ) : (
        <KeyboardScroll ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <Text style={styles.heading}>Who you invest for</Text>
              <Text style={styles.helper}>Founders see this name when you ask to connect, and our team checks it when you verify.</Text>
              <View style={styles.section}>
                <Input
                  label="Organisation or fund name"
                  value={organisationName}
                  onChangeText={(t) => {
                    setOrganisationName(t);
                    clear('organisationName');
                  }}
                  placeholder="e.g. Savanna Angels"
                  hint={editing ? 'Changing the name sends your account for a new check.' : 'If you invest alone, use your own name.'}
                  error={errors.organisationName}
                  maxLength={120}
                />
                <Input
                  label="Your role there (optional)"
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  placeholder="e.g. Managing partner"
                  maxLength={80}
                />
                <KindPicker label="What kind of investor are you?" choices={KINDS} value={kind} onChange={(v) => setKind(v as InvestorSetup['kind'])} />
              </View>
              <View style={styles.actions}>
                <FormError message={failed} />
                <Button title="Continue" onPress={next} />
                {!cameFromApp ? <TextLink title="Log out" onPress={() => void logOut()} /> : null}
              </View>
            </>
          ) : step === 2 ? (
            <>
              <Text style={styles.heading}>What you fund</Text>
              <Text style={styles.helper}>We use this to show you founders that fit, and to tell founders whether to pitch you.</Text>

              <View style={styles.section}>
                <MultiSelect
                  label="Sectors"
                  options={meta.sectors}
                  labels={labelMap(meta.sectors)}
                  values={sectors}
                  onChange={(v) => {
                    setSectors(v);
                    clear('sectors');
                  }}
                  error={errors.sectors}
                />
                <MultiSelect
                  label="Stages"
                  options={meta.stages}
                  labels={labelMap(meta.stages)}
                  values={stages}
                  onChange={(v) => {
                    setStages(v);
                    clear('stages');
                  }}
                  error={errors.stages}
                />
                <MultiSelect
                  label="How you invest"
                  options={meta.instruments}
                  labels={labelMap(meta.instruments)}
                  values={instruments}
                  onChange={(v) => {
                    setInstruments(v);
                    clear('instruments');
                  }}
                  error={errors.instruments}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.group}>Where</Text>
                <Text style={styles.small}>Leave empty for anywhere in Kenya.</Text>
                {counties.length ? (
                  <View style={styles.picked}>
                    {counties.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setCounties((all) => all.filter((x) => x !== c))}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${labelOf(c)}`}
                        style={({ pressed }) => [styles.pickedChip, pressed && { opacity: 0.6 }]}
                      >
                        <Text style={styles.pickedText}>{labelOf(c)}</Text>
                        <X size={16} color={colors.primaryDark} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.countyPick}>
                  <LongSelect
                    label={counties.length ? 'Add another county' : 'Counties (optional)'}
                    options={countiesLeft}
                    value={undefined}
                    onChange={(c) => setCounties((all) => (all.includes(c) ? all : [...all, c]))}
                    placeholder={counties.length ? 'Choose a county' : 'Anywhere in Kenya'}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.group}>How much</Text>
                <AmountField
                  label="Smallest amount you invest"
                  value={ticketMin}
                  onChange={(n) => {
                    setTicketMin(n);
                    clear('ticketMin');
                  }}
                  error={errors.ticketMin}
                />
                <AmountField
                  label="Largest amount you invest"
                  value={ticketMax}
                  onChange={(n) => {
                    setTicketMax(n);
                    clear('ticketMax');
                  }}
                  error={errors.ticketMax}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.group}>In your own words</Text>
                <Textarea
                  label="What are you looking for?"
                  value={mandateText}
                  onChangeText={(t) => {
                    setMandateText(t);
                    clear('mandateText');
                  }}
                  error={errors.mandateText}
                  maxLength={2000}
                />
                <Text style={[styles.count, written >= MANDATE_MIN && styles.countMet]}>
                  {written >= MANDATE_MIN ? `${written} characters. That is enough.` : `${written} of at least ${MANDATE_MIN} characters`}
                </Text>
                <View style={styles.example}>
                  <Text style={styles.exampleTitle}>For example</Text>
                  <Text style={styles.exampleText}>
                    We back early health and fintech startups in Kenya that already have paying customers and a founder who knows the market first-hand.
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <FormError message={failed} />
                <Button title="Continue" onPress={toShared} />
                <Button title="Back" variant="ghost" onPress={() => setStep(1)} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heading}>What is shared</Text>
              <Text style={styles.helper}>
                {editing ? 'These are your choices today. Change any of them and save.' : 'Both are off until you turn them on. You can change them later in Settings.'}
              </Text>
              <View style={styles.shared}>
                {SHARED.map(([key, title, line]) => (
                  <Pressable
                    key={key}
                    style={[styles.share, shared[key] && styles.shareOn]}
                    onPress={() => setShared((c) => ({ ...c, [key]: !c[key] }))}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: shared[key] }}
                    accessibilityLabel={`${title}. ${line}`}
                  >
                    <View style={styles.shareWords}>
                      <Text style={styles.shareTitle}>{title}</Text>
                      <Text style={styles.small}>{line}</Text>
                    </View>
                    <Switch value={shared[key]} onValueChange={(on) => setShared((c) => ({ ...c, [key]: on }))} />
                  </Pressable>
                ))}
              </View>
              <View style={styles.actions}>
                <FormError message={failed} />
                <Button title={editing ? 'Save changes' : 'Save and see founders'} loading={saving} onPress={() => void save()} />
                {!editing ? (
                  <>
                    <Text style={styles.small}>Verify now so you're ready to connect. It takes a phone number and a short statement.</Text>
                    <Button title="Save and verify now" variant="secondary" disabled={saving} onPress={() => void save(true)} />
                  </>
                ) : null}
                <Button title="Back" variant="ghost" onPress={() => setStep(2)} />
              </View>
            </>
          )}
        </KeyboardScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  steps: { paddingHorizontal: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[1.5], borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { padding: spacing[2], paddingTop: spacing[3], paddingBottom: spacing[6] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  helper: { fontSize: 16, color: colors.textMuted, marginTop: spacing[1] },
  section: { marginTop: spacing[3] },
  group: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  small: { fontSize: 14, color: colors.textMuted },
  picked: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[1.5] },
  pickedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    minHeight: touchTargetMin,
    paddingHorizontal: spacing[1.5],
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  pickedText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  countyPick: { marginTop: spacing[1.5] },
  // The Textarea leaves 16 below itself; the count belongs right under it.
  count: { fontSize: 14, color: colors.textMuted, marginTop: -spacing[1] },
  countMet: { color: colors.success },
  example: { backgroundColor: colors.grey100, borderRadius: radius.card, padding: spacing[1.5], marginTop: spacing[2], gap: spacing[0.5] },
  exampleTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  exampleText: { fontSize: 14, color: colors.textMuted },
  actions: { marginTop: spacing[4], gap: spacing[1] },
  shared: { marginTop: spacing[3], gap: spacing[1.5] },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: touchTargetMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing[2],
    backgroundColor: colors.white,
  },
  shareOn: { borderColor: colors.primary },
  shareWords: { flex: 1, gap: spacing[0.5] },
  shareTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
});
