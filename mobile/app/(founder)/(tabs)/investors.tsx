import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { founderService } from '../../../src/services';
import type { PlatformInvestorCard } from '../../../src/types';
import { colors, spacing } from '../../../src/theme/tokens';

function relationshipLabel(rel: PlatformInvestorCard['relationship']) {
  if (rel === 'in_your_group') return 'In your group';
  if (rel === 'pending_request') return 'Pending request';
  return 'On platform';
}

function relationshipVariant(rel: PlatformInvestorCard['relationship']) {
  if (rel === 'in_your_group') return 'success' as const;
  if (rel === 'pending_request') return 'warning' as const;
  return 'default' as const;
}

export default function FounderInvestorsTab() {
  const router = useRouter();
  const requestsQ = useQuery({
    queryKey: ['investor-requests'],
    queryFn: () => founderService.getInvestorRequests(),
  });
  const platformQ = useQuery({
    queryKey: ['platform-investors'],
    queryFn: () => founderService.getPlatformInvestors(),
  });

  if (requestsQ.isLoading || platformQ.isLoading) return <ScreenLoading />;
  if (requestsQ.isError || platformQ.isError) {
    return <ScreenError message="Could not load investors." onRetry={() => { requestsQ.refetch(); platformQ.refetch(); }} />;
  }

  const requests = requestsQ.data ?? [];
  const pending = requests.filter((r) => r.status === 'pending');
  const approvedMembers = requests.filter((r) => r.status === 'approved');
  const platform = platformQ.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.heading}>Investors</Text>

      <Text style={styles.sectionTitle}>Join requests</Text>
      {pending.length === 0 ? (
        <Text style={styles.emptyLine}>No pending requests right now.</Text>
      ) : (
        pending.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/founder/investor-request/${item.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.name}>{item.investorName}</Text>
              <Text style={styles.preview} numberOfLines={2}>{item.pitchPreview}</Text>
              <Badge label={item.status} variant="warning" />
            </Card>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Active in your group</Text>
      {approvedMembers.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/founder/investor-request/${item.id}`)}>
          <Card style={styles.card}>
            <Text style={styles.name}>{item.investorName}</Text>
            <Text style={styles.preview} numberOfLines={2}>{item.vision}</Text>
            <Badge label="approved" variant="success" />
          </Card>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Investors on FounderLink</Text>
      {platform.map((inv) => (
        <Card key={inv.id} style={styles.card}>
          <View style={styles.platformRow}>
            <View style={styles.platformMain}>
              <Text style={styles.name}>{inv.name}</Text>
              <Text style={styles.meta}>{inv.county} · {inv.ticketRangeLabel}</Text>
              <Text style={styles.preview}>{inv.focusAreas.join(' · ')}</Text>
            </View>
            <Badge label={relationshipLabel(inv.relationship)} variant={relationshipVariant(inv.relationship)} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[6], paddingBottom: spacing[6] },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing[2] },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: colors.text, marginTop: spacing[2], marginBottom: spacing[1] },
  emptyLine: { color: colors.textMuted, marginBottom: spacing[2] },
  card: { marginBottom: spacing[2] },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  preview: { color: colors.textMuted, marginVertical: spacing[1] },
  platformRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' },
  platformMain: { flex: 1 },
});
