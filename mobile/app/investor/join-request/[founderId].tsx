import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button, Textarea } from '../../../src/components/ui';
import { AmountField, FormError } from '../../../src/components/auth/parts';
import { Header } from '../../../src/components/layout/Header';
import { useToast } from '../../../src/components/ui/Toast';
import { investorService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

const PITCH_MIN = 20;

export default function JoinRequestScreen() {
  const { founderId } = useLocalSearchParams<{ founderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const [pitch, setPitch] = useState('');
  const [vision, setVision] = useState('');
  const [offer, setOffer] = useState('');
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [tried, setTried] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only to say who the request goes to; the form works without it.
  const founderQ = useQuery({
    queryKey: ['founder-profile', founderId],
    queryFn: () => investorService.getFounderPublicProfile(String(founderId)),
  });
  const who = founderQ.data ? (founderQ.data.businessName ?? founderQ.data.founderName) : null;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const pitchLength = pitch.trim().length;
  const pitchError =
    tried && pitchLength < PITCH_MIN
      ? pitchLength === 0
        ? 'Say why you are a good fit. She reads this first.'
        : `Add a little more: at least ${PITCH_MIN} characters (${pitchLength} so far).`
      : undefined;

  const submit = async () => {
    setTried(true);
    setRefusal(null);
    if (pitchLength < PITCH_MIN) return;
    setLoading(true);
    try {
      await investorService.submitJoinRequest(String(founderId), {
        pitch: pitch.trim(),
        vision: vision.trim(),
        offer: offer.trim(),
        amountKes: amount,
      });
      void queryClient.invalidateQueries({ queryKey: ['founder-profile', founderId] });
      void queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      show('Request sent', 'success');
      router.replace('/(investor)/(tabs)/requests');
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'The request was not sent. Check your connection and try again.';
      setRefusal(message);
      show(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Ask to join" onBack={back} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{who ? `Ask to join ${who}` : 'Ask to join'}</Text>

        <View style={styles.infoBox}>
          <Info size={20} color={colors.primaryDark} />
          <Text style={styles.infoText}>
            She sees your request and decides. If she accepts, you are connected and she can open a deal with this amount.
          </Text>
        </View>

        <View style={styles.fields}>
          <Textarea
            label="Why you are a good fit"
            value={pitch}
            onChangeText={setPitch}
            placeholder="What you have backed before, and why this business"
            error={pitchError}
          />
          <AmountField
            label="Amount you propose to invest (optional)"
            value={amount}
            onChange={setAmount}
            hint="FoundersLink never holds money. This is only your proposal."
          />
          <Textarea
            label="Your vision for the business (optional)"
            value={vision}
            onChangeText={setVision}
            placeholder="Where you see it in a few years"
          />
          <Textarea
            label="What you offer beyond money (optional)"
            value={offer}
            onChangeText={setOffer}
            placeholder="Introductions, experience, time"
          />
        </View>

        <View style={styles.action}>
          <FormError message={refusal} />
          <Button title="Send request" loading={loading} onPress={() => void submit()} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[6] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  infoBox: {
    marginTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1.5],
    padding: spacing[2],
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.text },
  fields: { marginTop: spacing[3], gap: spacing[2] },
  action: { marginTop: spacing[4], gap: spacing[1.5] },
});
