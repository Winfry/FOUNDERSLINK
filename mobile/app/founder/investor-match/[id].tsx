import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../../../src/components/ui';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function InvestorMatchProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const q = useQuery({ queryKey: ['investor-profile', id], queryFn: () => fundingService.getInvestorProfile(String(id)) });

  if (q.isLoading) return <ScreenLoading />;

  const data = q.data ?? {};
  const reasons = (data.reasons as { fits: boolean; text: string }[]) ?? [];
  const track = (data.trackRecord as { label: string; source: string }[]) ?? [];

  const connect = () => {
    if (user?.approvalStatus !== 'approved') {
      router.push('/founder/verify');
      return;
    }
    router.push('/(founder)/(tabs)/connections');
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
      <Button title="Connect" onPress={connect} />
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
