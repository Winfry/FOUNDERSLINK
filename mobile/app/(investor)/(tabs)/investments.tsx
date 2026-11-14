import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, EmptyState } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { kes, Tag } from '../../../src/components/overview/parts';
import { dealService } from '../../../src/services';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { checkInsOf, HEALTH, healthOf, isInvestment, longDate } from '../../../src/lib/investments';
import { colors, radius, spacing } from '../../../src/theme/tokens';

/**
 * My investments: every business she backed through FoundersLink, how
 * each is doing (from the goals they agreed), and when the next check-in
 * is. A record of what she put in, never a balance: the money moved
 * between her bank and theirs.
 */
export default function MyInvestments() {
  const router = useRouter();
  const wide = useWideLayout();
  const q = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list() });
  const pull = usePullToRefresh(() => q.refetch());
  const backed = (q.data ?? []).filter(isInvestment);
  const total = backed.reduce((n, d) => n + (d.terms?.amountKes ?? 0), 0);

  return (
    <ScrollView contentContainerStyle={[styles.page, wide && styles.pageWide]} refreshControl={<RefreshControl {...pull} />}>
      <PageTitle title="My investments" subtitle="How the businesses you backed are doing." />

      <View style={[styles.total, wide && styles.narrow]}>
        <Text style={styles.totalLabel}>Put in through FoundersLink</Text>
        <Text style={styles.totalMoney}>{kes(total)}</Text>
        <Text style={styles.totalSub}>in {backed.length} business{backed.length === 1 ? '' : 'es'}</Text>
      </View>

      {q.isLoading ? <Text style={styles.muted}>Loading your investments…</Text> : null}
      {q.isError ? (
        <Card style={[styles.card, wide && styles.narrow]}>
          <Text style={styles.name}>We couldn't load your investments.</Text>
          <Button title="Try again" variant="secondary" onPress={() => void q.refetch()} style={styles.start} />
        </Card>
      ) : null}
      {!q.isLoading && !q.isError && backed.length === 0 ? (
        <EmptyState title="No investments yet" description="When a deal you are in closes, the business appears here with how it is doing." actionLabel="Find businesses" onAction={() => router.navigate('/discover' as never)} />
      ) : null}

      <View style={wide ? styles.grid : styles.list}>
        {backed.map((d) => {
          const { health, line } = healthOf(d);
          const next = checkInsOf(d).find((c) => c.state === 'next');
          return (
            <Pressable key={d.id} onPress={() => router.push(`/investor/investment/${d.id}` as never)} accessibilityRole="link" style={wide ? styles.gridItem : undefined}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Avatar name={d.withName} size={52} />
                  <View style={styles.flex}>
                    <Text style={styles.name}>{d.title}</Text>
                    <Text style={styles.muted}>
                      {d.withName} · {kes(d.terms.amountKes)}
                    </Text>
                    <Text style={styles.line}>{line}</Text>
                    <Tag label={HEALTH[health].label} tone={HEALTH[health].tone} />
                  </View>
                </View>
                {next ? <Text style={styles.next}>Next check-in: {longDate(next.date)}</Text> : null}
                <Text style={styles.open}>Open {d.title} →</Text>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {backed.length ? <Text style={styles.note}>Money moved between your bank and theirs. FoundersLink keeps the record, never the money.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  pageWide: { gap: 18 },
  narrow: { maxWidth: 520 },
  total: { backgroundColor: colors.primaryDark, borderRadius: radius.card, padding: spacing[2] + 2, gap: 2 },
  totalLabel: { fontSize: 12, color: colors.onDarkDim },
  totalMoney: { fontSize: 28, color: colors.white },
  totalSub: { fontSize: 13, color: colors.onDarkDim },
  list: { gap: spacing[1.5] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  card: { gap: spacing[1] },
  row: { flexDirection: 'row', gap: spacing[1.5], alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '500', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  line: { fontSize: 13, color: colors.text, marginVertical: 6 },
  next: { fontSize: 13, color: colors.textMuted },
  open: { fontSize: 13, fontWeight: '500', color: colors.primary },
  start: { alignSelf: 'flex-start', marginTop: spacing[1] },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing[1] },
});
