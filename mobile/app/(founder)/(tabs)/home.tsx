import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenError, ScreenLoading, ScreenOffline } from '../../../src/components/layout/ScreenStates';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { founderService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import type { PlatformInvestorCard } from '../../../src/types';
import { colors, spacing } from '../../../src/theme/tokens';

function investorRelationshipLabel(rel: PlatformInvestorCard['relationship']) {
  if (rel === 'in_your_group') return 'In your group';
  if (rel === 'pending_request') return 'Pending request';
  return 'On platform';
}

function investorRelationshipVariant(rel: PlatformInvestorCard['relationship']) {
  if (rel === 'in_your_group') return 'success' as const;
  if (rel === 'pending_request') return 'warning' as const;
  return 'default' as const;
}

export default function FounderHomeScreen() {
  const { isOffline } = useNetworkStatus();
  const q = useQuery({ queryKey: ['founder-dashboard'], queryFn: () => founderService.getDashboard() });

  if (isOffline && !q.data) return <ScreenOffline onRetry={() => q.refetch()} />;
  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) return <ScreenError message="Could not load dashboard." onRetry={() => q.refetch()} />;

  const { profile, pendingInvestorRequests, documents, platformInvestors, platformFounders } = q.data!;
  const raisedPct = Math.min(100, Math.round((profile.fundsRaisedKes / profile.fundingTargetKes) * 100));
  const inGroupCount = platformInvestors.filter((i) => i.relationship === 'in_your_group').length;

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
        <Text style={styles.section}>Investors on FounderLink</Text>
        <Text style={styles.hint}>{inGroupCount} in your Round A group · {platformInvestors.length} on platform</Text>
        {platformInvestors.slice(0, 4).map((inv) => (
          <View key={inv.id} style={styles.peerRow}>
            <View style={styles.peerMain}>
              <Text style={styles.peerName}>{inv.name}</Text>
              <Text style={styles.peerMeta}>{inv.focusAreas.join(' · ')} · {inv.ticketRangeLabel}</Text>
            </View>
            <Badge label={investorRelationshipLabel(inv.relationship)} variant={investorRelationshipVariant(inv.relationship)} />
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.section}>Other approved founders</Text>
        <Text style={styles.hint}>Peers raising on the platform (for networking)</Text>
        {platformFounders.slice(0, 4).map((f) => (
          <View key={f.id} style={styles.peerRow}>
            <View style={styles.peerMain}>
              <Text style={styles.peerName}>{f.businessName}</Text>
              <Text style={styles.peerMeta}>{f.sector} · {f.county} · {f.stage}</Text>
            </View>
            <Badge label="Approved" variant="success" />
          </View>
        ))}
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
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing[1] },
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
  peerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[1],
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  peerMain: { flex: 1 },
  peerName: { fontWeight: '600', color: colors.text, fontSize: 15 },
  peerMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
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
