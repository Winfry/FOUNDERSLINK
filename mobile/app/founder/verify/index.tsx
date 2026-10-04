import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { CodeInput, Steps, TextLink } from '../../../src/components/auth/parts';
import { Button, Input, Textarea } from '../../../src/components/ui';
import { phoneKenyaSchema } from '../../../src/lib/validation';
import { vettingService } from '../../../src/services';
import { colors, radius, spacing } from '../../../src/theme/tokens';

const STEP_NAMES = ['Phone', 'Code', 'Statement'];
const STATEMENT_MIN = 20;
const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message ?? fallback;

export default function VerifyToConnectScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+254');
  const [code, setCode] = useState('');
  const [statement, setStatement] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'statement'>('phone');
  const [loading, setLoading] = useState(false);
  // What is wrong with the field on screen, said under it.
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const number = phone.replace(/\s/g, '');
    const checked = phoneKenyaSchema.safeParse(number);
    if (!checked.success) {
      setError('Enter your number starting with +254, like +254712345678.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await vettingService.verifyPhoneSend(number);
      await vettingService.saveDraft({ phone: number });
      setCode('');
      setStep('code');
    } catch (e) {
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
    setError(null);
    setLoading(true);
    try {
      await vettingService.saveDraft({ statement });
      await vettingService.submit();
      router.replace('/founder/verify/status');
    } catch (e) {
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'phone' ? (
          <>
            <Text style={styles.heading}>What is your phone number?</Text>
            <Text style={styles.helper}>
              Investors want to know there is a real person behind every profile. We send one code to check the number is yours.
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
                hint="A Kenyan number, like +254712345678."
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
            <Text style={styles.heading}>Say what your business does</Text>
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
                  I run Afya Booking, an app that lets patients book visits at small clinics in Nairobi. We started in 2024 and 12 clinics use it today.
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Button title="Submit for review" loading={loading} onPress={() => void submit()} />
            </View>
          </>
        ) : null}

        <View style={styles.note}>
          <FileText size={20} color={colors.textMuted} />
          <Text style={styles.noteText}>No documents are needed here. Business documents come later, at due diligence on a deal.</Text>
        </View>
      </ScrollView>
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
  actions: { marginTop: spacing[2] },
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
