import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Header } from '../../../src/components/layout/Header';
import { Badge, Button, Card } from '../../../src/components/ui';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { investorService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['founder-public', id],
    queryFn: () => investorService.getFounderPublicProfile(String(id)),
  });

  if (q.isLoading || !q.data) return <ScreenLoading rows={2} />;
  const f = q.data as Record<string, unknown>;

  return (
    <>
      <Header title="Founder profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.name}>{String(f.businessName)}</Text>
          <Text style={styles.meta}>{String(f.sector)} · {String(f.county)}</Text>
          <Text style={styles.ask}>{formatKes(Number(f.fundingAskKes))} target · {String(f.percentRaised)}% raised</Text>
          {f.verifiedDocumentsBadge ? <Badge label="Verified documents" variant="success" /> : null}
          <Text style={styles.lock}>Full document viewing unlocks after your request is approved.</Text>
        </Card>
        <Button title="Request to join" onPress={() => router.push(`/investor/join-request/${id}`)} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], gap: spacing[2] },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4 },
  ask: { marginVertical: spacing[1], color: colors.text },
  lock: { marginTop: spacing[2], fontSize: 13, color: colors.textMuted },
});
