import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Header } from '../../../src/components/layout/Header';
import { Button, FileUploader, Input, Textarea } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { investorService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

export default function JoinRequestScreen() {
  const { founderId } = useLocalSearchParams<{ founderId: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [pitch, setPitch] = useState('');
  const [vision, setVision] = useState('');
  const [offer, setOffer] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await investorService.submitJoinRequest(String(founderId), { pitch, vision, offer, amountKes: amount });
      show('Request submitted', 'success');
      router.replace('/(investor)/(tabs)/requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Request to join" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {step === 'form' ? (
          <>
            <Textarea label="Why you're a good fit" value={pitch} onChangeText={setPitch} />
            <Textarea label="Your vision for the project" value={vision} onChangeText={setVision} />
            <Textarea label="What you offer beyond capital" value={offer} onChangeText={setOffer} />
            <Input label="Proposed contribution (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
            <FileUploader label="Optional attachment" onChange={() => undefined} />
            <Button title="Preview" onPress={() => setStep('preview')} />
          </>
        ) : (
          <>
            <Text style={styles.previewTitle}>Preview</Text>
            <Text style={styles.preview}>{pitch}</Text>
            <Text style={styles.preview}>{vision}</Text>
            <Text style={styles.amount}>KES {amount}</Text>
            <Button title="Submit request" loading={loading} onPress={submit} />
            <Button title="Edit" variant="ghost" onPress={() => setStep('form')} />
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3] },
  previewTitle: { fontWeight: '700', fontSize: 18, color: colors.text },
  preview: { color: colors.textMuted, marginVertical: spacing[1], lineHeight: 22 },
  amount: { fontWeight: '700', color: colors.primary, marginBottom: spacing[2] },
});
