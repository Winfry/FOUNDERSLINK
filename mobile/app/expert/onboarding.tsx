import { useRouter } from 'expo-router';
import { PRACTICE, PRACTICE_AREAS, RATE_CARD_MAX, rateCardProblem, type RateItem, type RateUnit } from '@shared/expert-question';
import { allowedAreas, CATEGORIES, professionById, PROFESSIONS, regulatorOf, TRUST, type CategoryId } from '@shared/professions';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChoiceCards, FormError, type Choice } from '../../src/components/auth/parts';
import { Button, Input, MultiSelect, Textarea } from '../../src/components/ui';
import { Text } from '../../src/components/ui/Text';
import { API_URL, put } from '../../src/services/http/client';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, radius, spacing } from '../../src/theme/tokens';

const AREA_LABELS = Object.fromEntries(PRACTICE_AREAS.map((a) => [a, PRACTICE[a].label]));
const choicesIn = (category: CategoryId): Choice[] =>
  PROFESSIONS.filter((p) => p.category === category).map((p) => ({ value: p.id, title: p.label, line: p.line }));

const UNITS: { id: RateUnit; label: string }[] = [
  { id: 'fixed', label: 'Fixed price' },
  { id: 'hour', label: 'Per hour' },
  { id: 'free', label: 'Free' },
];

/** One line of the rate card as she types it: the price is text until saved. */
interface RateRow {
  key: number;
  service: string;
  area: string;
  unit: RateUnit;
  price: string;
}

/** "2026-12-31" as a date, or null when it is not a real, future date. */
function futureDate(text: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) return null;
  const d = new Date(`${text.trim()}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.getTime() < Date.now() ? null : d;
}

/**
 * An expert's profile. First what kind of work, then the profession, then
 * only what that profession is checked on: a licence number and expiry for
 * a licensed one (LSK, ICPAK...), a qualification for a certified one, and
 * nothing more for one checked on experience (references come at
 * verification). How she will be checked is said before she is asked.
 */
export default function ExpertOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const patchUser = useAuthStore((s) => s.patchUser);
  const [category, setCategory] = useState<CategoryId>('legal');
  const [profession, setProfession] = useState('lawyer');
  const [organisation, setOrganisation] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [qualification, setQualification] = useState('');
  const [awardedBy, setAwardedBy] = useState('');
  const [bio, setBio] = useState('');
  const [services, setServices] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [sessions, setSessions] = useState('3');
  // What she charges. Optional; members see it before they ask.
  const [rates, setRates] = useState<RateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chosen = professionById(profession);
  const regulator = regulatorOf(chosen);
  const trust = chosen?.trust ?? 'experience';

  const updateRate = (key: number, patch: Partial<RateRow>) => setRates((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRate = () =>
    setRates((rs) => (rs.length >= RATE_CARD_MAX ? rs : [...rs, { key: Date.now(), service: '', area: allowedAreas(profession)[0] ?? '', unit: 'fixed', price: '' }]));

  const pickCategory = (c: CategoryId) => {
    setCategory(c);
    const first = PROFESSIONS.find((p) => p.category === c);
    if (first) setProfession(first.id);
    setAreas([]);
    setRates([]);
  };

  const save = async () => {
    setError(null);
    if (trust === 'licensed' && registerNumber.trim().length < 2) {
      setError(`Add your ${regulator?.short ?? 'register'} number. It is how we check you.`);
      return;
    }
    const expires = expiry.trim() ? futureDate(expiry) : null;
    if (expiry.trim() && !expires) {
      setError('Write the date as year-month-day, for example 2026-12-31, and make sure it has not passed.');
      return;
    }
    if (trust === 'certified' && (qualification.trim().length < 2 || awardedBy.trim().length < 2)) {
      setError('Add your qualification and who awarded it. We check it with them.');
      return;
    }
    if (bio.trim().length < 10) {
      setError('Say in a sentence or two how you help.');
      return;
    }
    // The rate card, as saved: empty lines dropped, prices as numbers.
    const card: RateItem[] = rates
      .filter((r) => r.service.trim() || r.price.trim())
      .map((r) => ({
        service: r.service.trim(),
        area: r.area,
        unit: r.unit,
        price_kes: r.unit === 'free' ? null : Number(r.price.replace(/[^\d]/g, '')) || 0,
      }));
    const cardProblem = rateCardProblem(card, allowedAreas(profession));
    if (cardProblem) {
      setError(cardProblem);
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
          country: 'KE',
          organisation_name: organisation.trim() || undefined,
          register_number: trust === 'licensed' ? registerNumber.trim() : undefined,
          licence_expires_at: expires ? expires.toISOString() : undefined,
          qualification: trust === 'certified' ? qualification.trim() : undefined,
          qualification_body: trust === 'certified' ? awardedBy.trim() : undefined,
          bio: bio.trim(),
          services: services
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length >= 2)
            .slice(0, 10),
          // Only the areas her profession may offer.
          practice_areas: areas.filter((a) => allowedAreas(profession).includes(a)),
          rate_card: card,
          office_hours_per_month: perMonth,
        });
      }
      await patchUser({ expertOnboardingComplete: true });
      router.replace('/(expert)/(tabs)/sessions' as never);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Your profile could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const howText =
    trust === 'licensed' && regulator
      ? `We check you on the ${regulator.name} (${regulator.short}) register. You are shown only while your licence is current.`
      : trust === 'certified'
        ? 'We check your qualification with the body that awarded it.'
        : 'We check your work history and speak to two people you have worked with. You give their names when you verify.';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing[3], paddingBottom: insets.bottom + spacing[4] }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        Your expert profile
      </Text>
      <Text style={styles.lede}>Members find you by what you do. Before you are shown, a person at FoundersLink checks you.</Text>

      <View style={styles.group}>
        <Text style={styles.label}>What kind of work do you do?</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {CATEGORIES.map((c) => {
            const on = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => pickCategory(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ChoiceCards
        label="I am a"
        choices={choicesIn(category)}
        value={profession}
        onChange={(v) => {
          setProfession(v);
          setAreas([]);
          setRates([]);
        }}
      />

      <View style={styles.how}>
        <Text style={styles.howTitle}>{TRUST[trust].label}</Text>
        <Text style={styles.howText}>{howText}</Text>
      </View>

      {trust === 'licensed' ? (
        <>
          <Input
            label={`${regulator?.short ?? 'Register'} number`}
            hint={`The number on the ${regulator?.short ?? 'official'} register.`}
            value={registerNumber}
            onChangeText={setRegisterNumber}
            autoCapitalize="characters"
          />
          <Input
            label="Licence or practising certificate expires on (optional)"
            hint="For example 2026-12-31. We check you again when it runs out."
            value={expiry}
            onChangeText={setExpiry}
            placeholder="YYYY-MM-DD"
          />
        </>
      ) : null}
      {trust === 'certified' ? (
        <>
          <Input label="Your qualification" value={qualification} onChangeText={setQualification} placeholder="e.g. Certified Information Systems Auditor" />
          <Input label="Awarded by" value={awardedBy} onChangeText={setAwardedBy} placeholder="e.g. ISACA" />
          <Input label="Valid until (optional)" hint="For example 2027-06-30." value={expiry} onChangeText={setExpiry} placeholder="YYYY-MM-DD" />
        </>
      ) : null}

      <Input label="Firm or organisation (optional)" value={organisation} onChangeText={setOrganisation} placeholder="e.g. Odhiambo & Partners Advocates" />
      <Textarea
        label="How you help founders and investors"
        value={bio}
        onChangeText={setBio}
        placeholder="e.g. I run land searches and review agricultural leases before an investment."
      />
      <MultiSelect label="What you specialise in" options={allowedAreas(profession)} labels={AREA_LABELS} values={areas} onChange={setAreas} />
      {/* Her rate card: what she charges, shown to members before they ask. */}
      <View style={styles.group}>
        <Text style={styles.label}>Your rate card (optional)</Text>
        <Text style={styles.hint}>
          What you charge. Members see it before they ask you, and FoundersLink suggests you to those within budget. They pay you
          directly: FoundersLink never handles the money.
          {profession === 'lawyer' ? ' Your prices must follow the Advocates (Remuneration) Order.' : ''}
        </Text>
        {rates.map((r) => (
          <View key={r.key} style={styles.rate}>
            <Input label="What you do" value={r.service} onChangeText={(v) => updateRate(r.key, { service: v })} placeholder="e.g. Land search and title report" />
            <Text style={styles.small}>For</Text>
            <View style={styles.chips}>
              {allowedAreas(profession).map((a) => (
                <Pressable key={a} onPress={() => updateRate(r.key, { area: a })} accessibilityRole="radio" accessibilityState={{ selected: r.area === a }} style={[styles.chip, r.area === a && styles.chipOn]}>
                  <Text style={[styles.chipText, r.area === a && styles.chipTextOn]}>{AREA_LABELS[a]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chips}>
              {UNITS.map((u) => (
                <Pressable key={u.id} onPress={() => updateRate(r.key, { unit: u.id })} accessibilityRole="radio" accessibilityState={{ selected: r.unit === u.id }} style={[styles.chip, r.unit === u.id && styles.chipOn]}>
                  <Text style={[styles.chipText, r.unit === u.id && styles.chipTextOn]}>{u.label}</Text>
                </Pressable>
              ))}
            </View>
            {r.unit !== 'free' ? (
              <Input
                label={r.unit === 'hour' ? 'Price an hour (KES)' : 'Price (KES)'}
                value={r.price}
                onChangeText={(v) => updateRate(r.key, { price: v })}
                keyboardType="number-pad"
                placeholder="e.g. 8000"
              />
            ) : null}
            <Pressable onPress={() => setRates((rs) => rs.filter((x) => x.key !== r.key))} accessibilityRole="button" accessibilityLabel={`Remove ${r.service || 'this line'}`} hitSlop={6}>
              <Text style={styles.remove}>Remove this line</Text>
            </Pressable>
          </View>
        ))}
        {rates.length < RATE_CARD_MAX && allowedAreas(profession).length > 0 ? (
          <Button title={rates.length ? 'Add another line' : 'Add a price'} variant="secondary" size="sm" onPress={addRate} style={styles.add} />
        ) : null}
      </View>

      <Input label="Services (separate with commas)" value={services} onChangeText={setServices} placeholder="e.g. Land searches, Lease review" />
      <Input
        label="Free sessions a month"
        hint="Members can book up to this many sessions with you each month."
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
  title: { fontSize: 30, fontWeight: '300', color: colors.primaryDark, letterSpacing: -0.5 },
  lede: { fontSize: 16, color: colors.textMuted, marginBottom: spacing[1] },
  action: { marginTop: spacing[2], gap: spacing[1] },
  group: { gap: spacing[1] },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  chipTextOn: { color: colors.white },
  how: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing[1.5], gap: 4 },
  howTitle: { fontSize: 14, fontWeight: '500', color: colors.primary },
  howText: { fontSize: 13, lineHeight: 19, color: colors.text },
  hint: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  rate: { gap: spacing[1], padding: spacing[1.5], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  small: { fontSize: 12, color: colors.textMuted },
  remove: { fontSize: 13, color: colors.error, paddingVertical: 2 },
  add: { alignSelf: 'flex-start' },
});
