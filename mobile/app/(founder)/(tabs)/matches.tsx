import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading, ScreenOffline } from '../../../src/components/layout/ScreenStates';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { consentService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import type { InvestorMatchCard, MatchBand } from '../../../src/types';
import { colors, spacing } from '../../../src/theme/tokens';

type Segment = 'pitch' | 'pitchAfter' | 'dontPitch';

function bandLabel(band: MatchBand) {
  if (band === 'strong') return 'Strong';
  if (band === 'good') return 'Good';
  if (band === 'possible') return 'Possible';
  return 'Not a fit';
}

function bandVariant(band: MatchBand): 'success' | 'warning' | 'default' | 'error' {
  if (band === 'strong') return 'success';
  if (band === 'good') return 'default';
  if (band === 'possible') return 'warning';
  return 'error';
}

export default function MatchesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useNetworkStatus();
  const [segment, setSegment] = useState<Segment>('pitch');

  const consentQ = useQuery({ queryKey: ['consents'], queryFn: () => consentService.list() });
  const matchesQ = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches() });

  const aiMatchingOn = consentQ.data?.find((c) => c.purpose === 'ai_matching')?.granted ?? false;

  const list = useMemo(() => {
    const m = matchesQ.data;
    if (!m) return [];
    if (segment === 'pitch') return m.applyNow;
    if (segment === 'pitchAfter') return m.applyAfter;
    return m.notForYou;
  }, [matchesQ.data, segment]);

  if (isOffline && !matchesQ.data) return <ScreenOffline onRetry={() => matchesQ.refetch()} />;
  if (matchesQ.isLoading || consentQ.isLoading) return <ScreenLoading />;
  if (matchesQ.isError) return <ScreenError message="Could not load investor matches." onRetry={() => matchesQ.refetch()} />;

  const unverified = user?.approvalStatus !== 'approved';

  return (
    <View style={styles.flex}>
      {unverified ? (
        <Pressable style={styles.banner} onPress={() => router.push('/founder/verify')}>
          <Text style={styles.bannerTitle}>Verify to connect</Text>
          <Text style={styles.bannerText}>Complete verification to see names and start connections.</Text>
        </Pressable>
      ) : null}
      {!aiMatchingOn ? (
        <View style={styles.bannerMuted}>
          <Text style={styles.bannerText}>Turn on matching in Settings to see investor matches.</Text>
        </View>
      ) : null}
      <View style={styles.segments}>
        {(
          [
            ['pitch', 'Pitch'],
            ['pitchAfter', 'Pitch after you fix this'],
            ['dontPitch', "Don't pitch"],
          ] as const
        ).map(([key, label]) => (
          <Pressable key={key} style={[styles.segment, segment === key && styles.segmentOn]} onPress={() => setSegment(key)}>
            <Text style={[styles.segmentText, segment === key && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {!aiMatchingOn ? (
        <ScreenEmpty title="Matching is off" description="Turn on matching in Settings → Consents." />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={list}
          keyExtractor={(item) => item.investorUserId}
          ListEmptyComponent={<ScreenEmpty title="No investors here" description="Try another list or improve readiness." />}
          renderItem={({ item }) => <MatchCard item={item} onPress={() => router.push(`/founder/investor-match/${item.investorUserId}`)} />}
        />
      )}
    </View>
  );
}

function MatchCard({ item, onPress }: { item: InvestorMatchCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Badge label={bandLabel(item.band)} variant={bandVariant(item.band)} />
        </View>
        {item.reasons.slice(0, 2).map((r) => (
          <Text key={r.signal} style={styles.reason}>
            • {r.text}
          </Text>
        ))}
        {item.gaps.map((g) => (
          <Text key={g.text} style={styles.gap}>
            Gap: {g.text}
          </Text>
        ))}
        {item.riskFactors.map((rf) => (
          <Text key={rf.text} style={styles.risk}>
            Check: {rf.text}
          </Text>
        ))}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  banner: { backgroundColor: colors.primaryLight, padding: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  bannerMuted: { backgroundColor: '#F8FAFC', padding: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  bannerTitle: { fontWeight: '700', color: colors.primary, marginBottom: 4 },
  bannerText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: spacing[2] },
  segment: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  segmentTextOn: { color: colors.white },
  list: { padding: spacing[2], paddingBottom: spacing[6] },
  card: { marginBottom: spacing[2] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  name: { flex: 1, fontWeight: '700', fontSize: 16, color: colors.text },
  reason: { color: colors.text, fontSize: 13, lineHeight: 18 },
  gap: { color: colors.primary, fontSize: 13, marginTop: 4 },
  risk: { color: colors.warning, fontSize: 13, marginTop: 4 },
});
