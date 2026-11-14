import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Badge, Button, Card, StageBar } from '../../src/components/ui';
import { Text } from '../../src/components/ui/Text';
import { DEAL_STAGES, stageLabel } from '../../src/components/deal/StageStepper';
import { dealService } from '../../src/services';
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh';
import { colors, spacing } from '../../src/theme/tokens';
import type { Deal } from '../../src/types';

const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const index = Math.max(0, DEAL_STAGES.findIndex((s) => s.key === deal.stage));
  const closed = deal.stage === 'closed' || deal.stage === 'active';
  const amount = deal.terms?.amountKes;
  return (
    <Pressable onPress={onOpen} accessibilityRole="link" accessibilityLabel={`${deal.title}, ${stageLabel(deal.stage)}`}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Avatar name={deal.withName} size={44} />
          <View style={styles.flex}>
            <Text style={styles.title}>{deal.title}</Text>
            <Text style={styles.muted}>With {deal.withName}</Text>
          </View>
          <Badge label={stageLabel(deal.stage)} variant={closed ? 'success' : 'default'} />
        </View>
        <View style={styles.stages}>
          <StageBar index={index} total={DEAL_STAGES.length} />
        </View>
        <Text style={styles.muted}>
          Stage {index + 1} of {DEAL_STAGES.length}
          {amount ? ` · ${kes(amount)} proposed` : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

/**
 * Every deal she is part of, newest first, each with where it stands. A
 * deal room holds the terms, documents, checklist and chat; this page is
 * the way in from the side menu.
 */
export default function DealRoomsScreen() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list() });
  const pull = usePullToRefresh(() => q.refetch());
  const deals = q.data ?? [];
  const open = deals.filter((d) => d.stage !== 'closed' && d.stage !== 'active');
  const done = deals.filter((d) => d.stage === 'closed' || d.stage === 'active');

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Text style={styles.heading} accessibilityRole="header">
        Deal rooms
      </Text>
      <Text style={styles.sub}>Where each deal stands. FoundersLink records the deal, never the money.</Text>

      {q.isLoading ? <Text style={styles.muted}>Loading your deals…</Text> : null}
      {q.isError ? (
        <Card style={styles.card}>
          <Text style={styles.title}>We couldn't load your deals.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void q.refetch()} style={styles.button} />
        </Card>
      ) : null}
      {!q.isLoading && !q.isError && deals.length === 0 ? (
        <Card style={styles.card}>
          <Text style={styles.title}>No deals yet</Text>
          <Text style={styles.muted}>A deal room opens once you and someone you are connected with agree to explore a deal.</Text>
        </Card>
      ) : null}

      {open.length ? <Text style={styles.label}>In progress</Text> : null}
      {open.map((d) => (
        <DealCard key={d.id} deal={d} onOpen={() => router.push(`/deal/${d.id}` as never)} />
      ))}
      {done.length ? <Text style={styles.label}>Closed</Text> : null}
      {done.map((d) => (
        <DealCard key={d.id} deal={d} onOpen={() => router.push(`/deal/${d.id}` as never)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  heading: { fontSize: 28, color: colors.primaryDark, marginTop: spacing[1] },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing[1] },
  label: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1] },
  card: { gap: spacing[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '500' },
  muted: { fontSize: 13, color: colors.textMuted },
  stages: { marginTop: spacing[0.5] },
  button: { alignSelf: 'flex-start', marginTop: spacing[1] },
});
