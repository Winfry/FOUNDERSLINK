import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../../../src/components/ui';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { useToast } from '../../../src/components/ui/Toast';
import { connectionService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function InvestorMatchProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const q = useQuery({ queryKey: ['investor-profile', id], queryFn: () => fundingService.getInvestorProfile(String(id)) });

  const { show } = useToast();

  if (q.isLoading) return <ScreenLoading />;

  const data = q.data ?? {};
  const reasons = (data.reasons as { fits: boolean; text: string }[]) ?? [];
  const track = (data.trackRecord as { label: string; source: string }[]) ?? [];

  // Who the request goes to. A match built from public information has
  // nobody behind it on FounderLink, so there is no one to ask.
  const personId = (data.connectUserId as string | null | undefined) ?? (data.connectUserId === undefined ? String(id) : null);

  const connect = async () => {
    if (user?.approvalStatus !== 'approved') {
      router.push('/founder/verify');
      return;
    }
    if (!personId) {
      show('This investor is not on FounderLink yet, so there is nobody to connect with here.', 'error');
      return;
    }
    try {
      await connectionService.request(personId, 'I would like to connect about my business.');
      show('Request sent', 'success');
      router.push('/(founder)/(tabs)/connections');
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Could not send the request', 'error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{String(data.displayName ?? 'Investor')}</Text>
      <Text style={styles.section}>Fit breakdown</Text>
      {reasons.map((r) => (
        <Text key={r.text} style={styles.line}>{r.fits ? '✓' : '–'} {r.text}</Text>
      ))}
      <Text style={styles.section}>What they fund</Text>
      <Text style={styles.body}>{String(data.whatTheyFund ?? '')}</Text>
      <Text style={styles.section}>Track record</Text>
      {track.map((t) => (
        <Text key={t.label} style={styles.body}>
          {t.label} ({t.source === 'platform_deal' ? 'Verified on FounderLink' : t.source === 'public' ? 'Public' : 'Self-reported'})
        </Text>
      ))}
      <Button title="Connect" onPress={() => void connect()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], backgroundColor: colors.white, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: { fontWeight: '700', marginTop: spacing[2], color: colors.text },
  line: { color: colors.text, lineHeight: 20 },
  body: { color: colors.textMuted, lineHeight: 20 },
});
