import { useRouter } from 'expo-router';
import { KeyboardScroll } from '../../../src/components/ui/KeyboardScroll';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { CodeInput, Steps, TextLink } from '../../../src/components/auth/parts';
import { Button, Input, Textarea } from '../../../src/components/ui';
import { phoneKenyaSchema } from '../../../src/lib/validation';
import { investorService, vettingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing } from '../../../src/theme/tokens';

const STEP_NAMES = ['Phone', 'Code', 'Statement'];
const STATEMENT_MIN = 20;
const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message ?? fallback;

export default function VerifyToConnectScreen() {
  const router = useRouter();
  const isInvestor = useAuthStore((s) => s.user?.role) === 'investor';
  // An investor has to say what she funds before she can be checked.
  const [needsSetup, setNeedsSetup] = useState(false);
  const [phone, setPhone] = useState('+254');
  const [code, setCode] = useState('');
  const [statement, setStatement] = useState('');
  const [website, setWebsite] = useState('');
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'code' | 'statement'>('phone');
  const [loading, setLoading] = useState(false);
  // What is wrong with the field on screen, said under it.
  const [error, setError] = useState<string | null>(null);

  // What she has already done, so she picks up where she left off: a
  // confirmed phone is not asked for again, and her statement is kept.
  const saved = useQuery({ queryKey: ['vetting'], queryFn: () => vettingService.getApplication() });
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    if (resumed || !saved.data) return;
    setResumed(true);
    if (saved.data.accountPhone) setPhone(saved.data.accountPhone);
    if (saved.data.statement) setStatement(saved.data.statement);
    if (saved.data.organisationWebsite) setWebsite(saved.data.organisationWebsite);
    if (saved.data.phoneVerified) setStep('statement');
  }, [saved.data, resumed]);

  const sendCode = async () => {
    // Kenyans write their number as 07… or 01…; the backend keeps it as +254….
    const typed = phone.replace(/[\s-]/g, '');
    const number = /^0[17]\d{8}$/.test(typed) ? `+254${typed.slice(1)}` : typed;
    const checked = phoneKenyaSchema.safeParse(number);
    if (!checked.success) {
      setError('Enter a Kenyan mobile number, like 0712 345 678 or +254712345678.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setPhone(number);
      await vettingService.saveDraft({ phone: number });
      await vettingService.verifyPhoneSend(number);
      setCode('');
      setStep('code');
    } catch (e) {
      // The number is already confirmed as hers: nothing more to prove.
      if ((e as { code?: string })?.code === 'ALREADY_VERIFIED') {
        setStep('statement');
        return;
      }
      setError(messageOf(e, 'We could not send the code. Check the number and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (code.length !== 6) {
      setError('Enter all six digits of the code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await vettingService.verifyPhoneConfirm(code);
      setStep('statement');
    } catch (e) {
      setError(messageOf(e, 'That code is not right. Check it, or send a new one.'));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (statement.trim().length < STATEMENT_MIN) {
      setError(`Write at least ${STATEMENT_MIN} characters so the reviewer knows what you do.`);
      return;
    }
    // "example.com" is accepted: the https:// is added for her.
    let organisationWebsite: string | undefined;
    const typed = website.trim();
    if (isInvestor && typed) {
      const full = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`;
      if (!/^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i.test(full)) {
        setWebsiteError('Enter a website address, like savanna-angels.co.ke, or leave this empty.');
        return;
      }
      organisationWebsite = full;
    }
    setWebsiteError(null);
    setError(null);
    setNeedsSetup(false);
    setLoading(true);
    try {
      // The reviewer checks an investor against the organisation she invests for.
      let organisationName: string | undefined;
      if (isInvestor) {
        organisationName = (await investorService.getSetup())?.organisationName;
        if (!organisationName) {
          setNeedsSetup(true);
          setError('First tell us which organisation you invest for, then come back here to verify.');
          return;
        }
      }
      await vettingService.saveDraft({ statement, organisationName, organisationWebsite });
      await vettingService.submit();
      router.replace('/founder/verify/status');
    } catch (e) {
      // Her email has not been confirmed yet. Take her to do it now: a new
      // code is sent, and she comes straight back here, statement kept.
      if ((e as { code?: string })?.code === 'EMAIL_NOT_VERIFIED') {
        router.push('/auth/verify-email?then=verify');
        return;
      }
      setError(messageOf(e, 'We could not submit your details. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const written = statement.trim().length;

  return (
    <View style={styles.flex}>
      <Header
        title="Verify to connect"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View style={styles.steps}>
        <Steps names={STEP_NAMES} current={STEP_NAMES.indexOf(step === 'phone' ? 'Phone' : step === 'code' ? 'Code' : 'Statement') + 1} />
      </View>
      <KeyboardScroll contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {saved.data && saved.data.emailVerified === false ? (
          <View style={styles.example}>
            <Text style={styles.exampleTitle}>First, confirm your email</Text>
            <Text style={styles.exampleText}>
              We send the decision on your verification to your email, so it has to be confirmed before you can submit.
            </Text>
            <View style={{ marginTop: spacing[1.5] }}>
              <Button title="Confirm my email" onPress={() => router.push('/auth/verify-email?then=verify')} />
            </View>
          </View>
        ) : null}

        {step === 'phone' ? (
          <>
            <Text style={styles.heading}>What is your phone number?</Text>
            <Text style={styles.helper}>
              {isInvestor ? 'Founders' : 'Investors'} want to know there is a real person behind every profile. We send one code to check the number is yours.
            </Text>
            <View style={styles.field}>
              <Input
                label="Phone number"
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  setError(null);
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                hint="A Kenyan mobile number, like 0712 345 678."
                error={error ?? undefined}
              />
            </View>
            <View style={styles.actions}>
              <Button title="Send code" loading={loading} onPress={() => void sendCode()} />
            </View>
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <Text style={styles.heading}>Enter the code</Text>
            <Text style={styles.helper}>
              We sent six digits by SMS to <Text style={styles.strong}>{phone.replace(/\s/g, '')}</Text>. This proves the number is yours.
            </Text>
            <View style={styles.field}>
              <CodeInput
                label="Six-digit code"
                value={code}
                onChange={(c) => {
                  setCode(c);
                  setError(null);
                }}
                error={error ?? undefined}
              />
              <TextLink
                title="Use a different number or send again"
                align="left"
                onPress={() => {
                  setError(null);
                  setStep('phone');
                }}
              />
            </View>
            <View style={styles.actions}>
              <Button title="Confirm phone" loading={loading} onPress={() => void confirmCode()} />
            </View>
          </>
        ) : null}

        {step === 'statement' ? (
          <>
            <Text style={styles.heading}>{isInvestor ? 'Say who you invest for' : 'Say what your business does'}</Text>
            <Text style={styles.helper}>
              A person on our team reads this before approving you. Two or three honest sentences are enough.
            </Text>
            <View style={styles.field}>
              <Textarea
                label="Your statement"
                value={statement}
                onChangeText={(t) => {
                  setStatement(t);
                  setError(null);
                }}
                error={error ?? undefined}
                maxLength={2000}
              />
              <Text style={[styles.count, written >= STATEMENT_MIN && styles.countMet]}>
                {written >= STATEMENT_MIN
                  ? `${written} characters. That is enough.`
                  : `${written} of at least ${STATEMENT_MIN} characters`}
              </Text>
              <View style={styles.example}>
                <Text style={styles.exampleTitle}>For example</Text>
                <Text style={styles.exampleText}>
                  {isInvestor
                    ? 'I am a partner at Savanna Angels, a group of angel investors in Nairobi. We have backed six early health and fintech startups since 2021.'
                    : 'I run Afya Booking, an app that lets patients book visits at small clinics in Nairobi. We started in 2024 and 12 clinics use it today.'}
                </Text>
              </View>
              {isInvestor ? (
                <View style={styles.website}>
                  <Input
                    label="Website (optional)"
                    value={website}
                    onChangeText={(t) => {
                      setWebsite(t);
                      setWebsiteError(null);
                    }}
                    placeholder="e.g. savanna-angels.co.ke"
                    hint="A website lets our reviewer check your organisation faster"
                    error={websiteError ?? undefined}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    maxLength={200}
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Button title="Submit for review" loading={loading} onPress={() => void submit()} />
              {needsSetup ? (
                <Button title="Say what I fund" variant="secondary" onPress={() => router.push('/investor/onboarding')} />
              ) : null}
            </View>
          </>
        ) : null}

        <View style={styles.note}>
          <FileText size={20} color={colors.textMuted} />
          <Text style={styles.noteText}>{isInvestor
              ? 'No documents are needed here. Documents are shared later, at due diligence on a deal.'
              : 'No documents are needed here. Business documents come later, at due diligence on a deal.'}</Text>
        </View>
      </KeyboardScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  steps: { paddingHorizontal: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[1.5], borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { padding: spacing[2], paddingTop: spacing[3], paddingBottom: spacing[6] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  helper: { fontSize: 16, color: colors.textMuted, marginTop: spacing[1] },
  strong: { fontSize: 16, fontWeight: '700', color: colors.text },
  field: { marginTop: spacing[3] },
  website: { marginTop: spacing[3] },
  actions: { marginTop: spacing[2], gap: spacing[1] },
  // The Textarea leaves 16 below itself; the count belongs right under it.
  count: { fontSize: 14, color: colors.textMuted, marginTop: -spacing[1] },
  countMet: { color: colors.success },
  example: {
    backgroundColor: colors.grey100,
    borderRadius: radius.card,
    padding: spacing[1.5],
    marginTop: spacing[2],
    gap: spacing[0.5],
  },
  exampleTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  exampleText: { fontSize: 14, color: colors.textMuted },
  note: { flexDirection: 'row', gap: spacing[1], marginTop: spacing[4], alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 14, color: colors.textMuted },
});
