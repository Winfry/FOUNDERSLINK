import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenError, ScreenLoading, ScreenOffline } from '../../../src/components/layout/ScreenStates';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { founderService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderHomeScreen() {
  const { isOffline } = useNetworkStatus();
  const q = useQuery({ queryKey: ['founder-dashboard'], queryFn: () => founderService.getDashboard() });

  if (isOffline && !q.data) return <ScreenOffline onRetry={() => q.refetch()} />;
  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) return <ScreenError message="Could not load dashboard." onRetry={() => q.refetch()} />;

  const { profile, pendingInvestorRequests, documents } = q.data!;
  const raisedPct = Math.min(100, Math.round((profile.fundsRaisedKes / profile.fundingTargetKes) * 100));

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Dashboard</Text>
      <Card>
        <Text style={styles.business}>{profile.businessName}</Text>
        <Text style={styles.meta}>{profile.county} · {profile.stage.replace('_', ' ')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Profile completeness</Text>
          <Badge label={`${profile.profileCompleteness}%`} variant="default" />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${profile.profileCompleteness}%` }]} />
        </View>
      </Card>
      <Card>
        <Text style={styles.section}>Funding progress</Text>
        <Text style={styles.amount}>
          {formatKes(profile.fundsRaisedKes)} of {formatKes(profile.fundingTargetKes)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${raisedPct}%` }]} />
        </View>
      </Card>
      <Card>
        <Text style={styles.section}>Pending investor requests</Text>
        <Text style={styles.stat}>{pendingInvestorRequests}</Text>
      </Card>
      <Card>
        <Text style={styles.section}>Documents</Text>
        {documents.slice(0, 3).map((d) => (
          <View key={d.id} style={styles.docRow}>
            <Text style={styles.docLabel}>{d.label}</Text>
            <Badge
              label={d.status.replace('_', ' ')}
              variant={
                d.status === 'verified' ? 'success' : d.status === 'rejected' ? 'error' : 'warning'
              }
            />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[2], paddingTop: spacing[6], gap: spacing[2] },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  business: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4, marginBottom: spacing[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textMuted },
  section: { fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  amount: { fontSize: 16, color: colors.text, marginBottom: spacing[1] },
  stat: { fontSize: 28, fontWeight: '700', color: colors.primary },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing[1],
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  docLabel: { flex: 1, marginRight: 8, color: colors.text, fontSize: 14 },
});
