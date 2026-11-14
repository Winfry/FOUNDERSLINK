import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Avatar, Button, Card, ConfirmModal, useToast } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { Empty, Panel, Tag } from '../../../src/components/overview/parts';
import { stageLabel } from '../../../src/components/deal/StageStepper';
import { dealService, investorService, type JoinRequestRow } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';
import type { ApiError } from '../../../src/types';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';

const ksh = (amount: number) => `KSh ${Math.round(amount).toLocaleString('en-KE')}`;

const STATUS = {
  pending: { label: 'Deciding', tone: 'quiet' as const },
  accepted: { label: 'Connected', tone: 'done' as const },
  declined: { label: 'Declined', tone: 'quiet' as const },
};

function sentOn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `Sent ${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function InvestorRequestsTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  // Asked again every few seconds, so a founder's answer shows without a reload.
  const q = useQuery({ queryKey: ['join-requests'], queryFn: () => investorService.getJoinRequests(), refetchInterval: 8000 });
  const pull = usePullToRefresh(q.refetch);
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

  const card = (r: JoinRequestRow) => {
    const status = STATUS[r.status];
    const date = sentOn(r.createdAt);
    return (
      <Card key={r.id} style={styles.card}>
        <View style={styles.person}>
          <Avatar name={r.founderName} size={48} />
          <View style={styles.flex}>
            <Text style={styles.name}>{r.founderName}</Text>
            <Text style={styles.proposed}>
              {r.proposedAmountKes > 0 ? `You proposed ${ksh(r.proposedAmountKes)}` : 'No amount proposed'}
            </Text>
            {date ? <Text style={styles.meta}>{date}</Text> : null}
          </View>
          <Tag label={status.label} tone={status.tone} />
        </View>
        {r.pitch ? (
          <Text style={styles.pitch} numberOfLines={3}>
            {r.pitch}
          </Text>
        ) : null}
        {r.status === 'declined' ? (
          <View style={styles.reason}>
            <Text style={styles.reasonTitle}>Reason given</Text>
            <Text style={styles.meta}>{r.declineReason || 'No reason was given.'}</Text>
          </View>
        ) : null}
        {r.status === 'pending' ? <Button title="Withdraw" variant="secondary" onPress={() => setWithdrawing(r)} /> : null}
        {r.status === 'accepted' ? <Button title="Open the chat" variant="soft" onPress={() => router.push('/conversations')} /> : null}
      </Card>
    );
  };

  const group = (title: string, list: JoinRequestRow[]) =>
    list.length ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {list.map(card)}
      </View>
    ) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap} refreshControl={<RefreshControl {...pull} />}>
      <PageTitle title="Your requests" subtitle="The founders you asked to connect with." />

      {rows.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your first connection starts here</Text>
          <Text style={styles.emptyBody}>
            Find a business that fits and send the founder a request with the amount you have in mind. When they accept, you can chat and start a deal.
          </Text>
          <Button title="Find businesses" onPress={toDiscover} style={styles.topGap} />
        </Card>
      ) : (
        <>
          {group('Waiting for a reply', pending)}
          {group('Connected', accepted)}
          {group('Declined', declined)}
        </>
      )}

      {dealsQ.isLoading ? (
        <SkeletonCard />
      ) : (
        <Panel
          title="Your deals"
          sub="Money moves between banks. FoundersLink keeps the record."
          link={!dealsQ.isError && deals.length === 0 && rows.length > 0 ? 'Find more founders' : undefined}
          onLink={toDiscover}
        >
          {dealsQ.isError ? (
            <>
              <Empty text={(dealsQ.error as { message?: string })?.message ?? "We couldn't load your deals. Check your connection and try again."} />
              <Button title="Try again" variant="secondary" size="sm" onPress={() => void dealsQ.refetch()} style={styles.start} />
            </>
          ) : deals.length === 0 ? (
            <Empty text="No deals yet. A deal starts once a founder accepts your request and the two of you agree to explore one." />
          ) : (
            deals.map((d, i) => (
              <Pressable
                key={d.id}
                onPress={() => router.push(`/deal/${d.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open deal ${d.title}`}
                style={({ pressed }) => [styles.dealRow, i < deals.length - 1 && styles.rowLine, pressed && styles.pressed]}
              >
                <Avatar name={d.withName} size={40} ring={false} />
                <View style={styles.flex}>
                  <Text style={styles.dealTitle} numberOfLines={2}>
                    {d.title}
                  </Text>
                  <Text style={styles.meta}>With {d.withName}</Text>
                </View>
                <Tag label={stageLabel(d.stage)} tone="todo" />
              </Pressable>
            ))
          )}
        </Panel>
      )}

      <ConfirmModal
        visible={!!withdrawing}
        title="Withdraw this request?"
        message={
          withdrawing
            ? `${withdrawing.founderName} will no longer see your request. You can send them a new one later.`
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
  screen: { backgroundColor: 'transparent' },
  wrap: { flexGrow: 1, paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[2] },
  flex: { flex: 1, minWidth: 0 },
  section: { gap: spacing[1.5] },
  sectionTitle: { fontSize: 12, color: colors.textMuted },
  card: { gap: spacing[1.5] },
  person: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  name: { fontSize: 16, fontWeight: '500', color: colors.text },
  proposed: { fontSize: 13, color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  pitch: { fontSize: 14, color: colors.text },
  reason: { backgroundColor: colors.grey100, borderRadius: 14, padding: spacing[1.5], gap: 2 },
  reasonTitle: { fontSize: 13, fontWeight: '500', color: colors.text },
  start: { alignSelf: 'flex-start' },
  topGap: { marginTop: spacing[1.5] },
  pressed: { opacity: 0.85 },
  dealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: 13 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dealTitle: { fontSize: 14, color: colors.text },
  emptyCard: { gap: 6 },
  emptyTitle: { fontSize: 20, color: colors.primaryDark },
  emptyBody: { fontSize: 14, color: colors.textMuted },
});

export default withBackdrop(InvestorRequestsTab);
