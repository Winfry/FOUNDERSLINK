import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../../src/components/layout/Header';
import { Button, Input, Textarea } from '../../../src/components/ui';
import { vettingService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

export default function VerifyToConnectScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+254');
  const [code, setCode] = useState('');
  const [statement, setStatement] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'statement'>('phone');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    try {
      await vettingService.verifyPhoneSend(phone);
      await vettingService.saveDraft({ phone });
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setLoading(true);
    try {
      await vettingService.verifyPhoneConfirm(code);
      setStep('statement');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      await vettingService.saveDraft({ statement });
      await vettingService.submit();
      router.replace('/founder/verify/status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Header title="Verify to connect" subtitle="Level 2 — before you connect or message" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>No documents here. Business documents come at due diligence on a deal.</Text>
        {step === 'phone' ? (
          <>
            <Input label="Phone (+254)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Button title="Send code" loading={loading} onPress={() => void sendCode()} />
          </>
        ) : null}
        {step === 'code' ? (
          <>
            <Input label="SMS code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            <Button title="Confirm phone" loading={loading} onPress={() => void confirmCode()} />
          </>
        ) : null}
        {step === 'statement' ? (
          <>
            <Textarea label="Short statement about your business" value={statement} onChangeText={setStatement} />
            <Button title="Submit for review" loading={loading} onPress={() => void submit()} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[3], gap: spacing[2] },
  note: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing[2] },
});
