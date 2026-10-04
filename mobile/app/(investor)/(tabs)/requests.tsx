import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronRight, Handshake, Send } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button, Card, ConfirmModal, useToast } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { TextLink } from '../../../src/components/auth/parts';
import { stageLabel } from '../../../src/components/deal/StageStepper';
import { dealService, investorService, type JoinRequestRow } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';
import type { ApiError } from '../../../src/types';

const ksh = (amount: number) => `KSh ${Math.round(amount).toLocaleString('en-KE')}`;

function sentOn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `Sent ${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function InvestorRequestsTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  // Asked again every few seconds, so a founder's answer shows without a reload.
  const q = useQuery({ queryKey: ['join-requests'], queryFn: () => investorService.getJoinRequests(), refetchInterval: 8000 });
  const dealsQ = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list(), refetchInterval: 8000 });
  const [withdrawing, setWithdrawing] = useState<JoinRequestRow | null>(null);
  const [busy, setBusy] = useState(false);

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) {
    const e = q.error as unknown as ApiError;
    return <ScreenError message={e.message} code={e.code} onRetry={() => q.refetch()} />;
  }

  const rows = q.data ?? [];
  const pending = rows.filter((r) => r.status === 'pending');
  const accepted = rows.filter((r) => r.status === 'accepted');
  const declined = rows.filter((r) => r.status === 'declined');
  const deals = dealsQ.data ?? [];
  const toDiscover = () => router.push('/(investor)/(tabs)/discover');

  const withdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    try {
      await investorService.withdrawJoinRequest(withdrawing.id);
      toast.show(`Your request to ${withdrawing.founderName} is withdrawn`, 'success');
      await qc.invalidateQueries({ queryKey: ['join-requests'] });
    } catch (e) {
      toast.show((e as { message?: string })?.message ?? 'We could not withdraw the request. Try again.', 'error');
    } finally {
      setBusy(false);
      setWithdrawing(null);
    }
  };

  const card = (r: JoinRequestRow) => (
    <Card key={r.id} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.name}>{r.founderName}</Text>
        <Badge
          label={r.status === 'pending' ? 'Waiting' : r.status === 'accepted' ? 'Connected' : 'Declined'}
          variant={r.status === 'pending' ? 'default' : r.status === 'accepted' ? 'success' : 'muted'}
        />
      </View>
      {r.proposedAmountKes > 0 ? (
        <View>
          <Text style={styles.amountLabel}>You proposed</Text>
          <Text style={styles.amount}>{ksh(r.proposedAmountKes)}</Text>
        </View>
      ) : (
        <Text style={styles.meta}>No amount proposed</Text>
      )}
      {r.pitch ? (
        <Text style={styles.pitch} numberOfLines={3}>
          {r.pitch}
        </Text>
      ) : null}
      {r.status === 'declined' ? (
        <View style={styles.reason}>
          <Text style={styles.reasonTitle}>Reason given</Text>
          <Text style={styles.reasonText}>{r.declineReason || 'She did not give a reason.'}</Text>
        </View>
      ) : null}
      {sentOn(r.createdAt) ? <Text style={styles.date}>{sentOn(r.createdAt)}</Text> : null}
      {r.status === 'pending' ? <Button title="Withdraw" variant="secondary" onPress={() => setWithdrawing(r)} /> : null}
      {r.status === 'accepted' ? <Button title="Message" variant="secondary" onPress={() => router.push('/conversations')} /> : null}
    </Card>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.heading}>Requests</Text>
        <Text style={styles.sub}>The founders you asked to connect with, and the deals that followed.</Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Send size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>You have not asked to connect yet</Text>
          <Text style={styles.emptyBody}>
            Find a founder that fits in Discover and send her a request with the amount you have in mind. When she accepts, you can chat and start a deal.
          </Text>
          <Button title="Find founders" onPress={toDiscover} style={styles.emptyBtn} />
        </View>
      ) : (
        <>
          {pending.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Waiting for a reply</Text>
              {pending.map(card)}
            </View>
          ) : null}
          {accepted.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected</Text>
              {accepted.map(card)}
            </View>
          ) : null}
          {declined.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Declined</Text>
              {declined.map(card)}
            </View>
          ) : null}
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your deals</Text>
        {dealsQ.isLoading ? (
          <Text style={styles.meta}>Loading your deals...</Text>
        ) : dealsQ.isError ? (
          <Card style={styles.card}>
            <Text style={styles.meta}>
              {(dealsQ.error as { message?: string })?.message ?? "We couldn't load your deals. Check your connection and try again."}
            </Text>
            <Button title="Try again" variant="secondary" onPress={() => void dealsQ.refetch()} />
          </Card>
        ) : deals.length === 0 ? (
          <Card style={styles.card}>
            <View style={styles.noDeals}>
              <Handshake size={20} color={colors.textMuted} />
              <Text style={styles.noDealsText}>
                No deals yet. A deal starts once a founder accepts your request and the two of you agree to explore one.
              </Text>
            </View>
            {rows.length > 0 ? <TextLink title="Find more founders" align="left" onPress={toDiscover} /> : null}
          </Card>
        ) : (
          deals.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/deal/${d.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open deal ${d.title}`}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.deal}>
                <View style={styles.dealText}>
                  <Text style={styles.name}>{d.title}</Text>
                  <Text style={styles.meta}>With {d.withName}</Text>
                  <View style={styles.dealBadge}>
                    <Badge label={stageLabel(d.stage)} variant="default" />
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </Card>
            </Pressable>
          ))
        )}
      </View>

      <ConfirmModal
        visible={!!withdrawing}
        title="Withdraw this request?"
        message={
          withdrawing
            ? `${withdrawing.founderName} will no longer see your request. You can send her a new one later.`
            : ''
        }
        confirmLabel="Withdraw"
        cancelLabel="Keep it"
        destructive
        loading={busy}
        onCancel={() => setWithdrawing(null)}
        onConfirm={() => void withdraw()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  wrap: { flexGrow: 1, padding: spacing[2], paddingBottom: spacing[4], gap: spacing[3] },
  head: { gap: spacing[0.5] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, fontWeight: '500', color: colors.textMuted },
  section: { gap: spacing[1.5] },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  card: { gap: spacing[1.5] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  amountLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  amount: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
  pitch: { fontSize: 16, fontWeight: '500', color: colors.text },
  meta: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  date: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  reason: { backgroundColor: colors.grey100, borderRadius: 12, padding: spacing[1.5], gap: spacing[0.5] },
  reasonTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  reasonText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  noDeals: { flexDirection: 'row', gap: spacing[1.5], alignItems: 'flex-start' },
  noDealsText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textMuted },
  pressed: { opacity: 0.85 },
  deal: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dealText: { flex: 1, gap: spacing[0.5] },
  dealBadge: { flexDirection: 'row', marginTop: spacing[0.5] },
  empty: { alignItems: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[1], gap: spacing[1] },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 16, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
  emptyBtn: { alignSelf: 'stretch', marginTop: spacing[2] },
});
