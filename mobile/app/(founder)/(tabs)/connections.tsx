import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Inbox, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Avatar, Badge, Button, Card } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { kes, words } from '../../../src/components/matches/parts';
import { useToast } from '../../../src/components/ui/Toast';
import { connectionService, dealService } from '../../../src/services';
import type { ConnectionJoinRequest } from '../../../src/types';
import { colors, spacing, touchTargetMin } from '../../../src/theme/tokens';

function sentStatus(status: ConnectionJoinRequest['status']): { label: string; variant: 'default' | 'success' | 'muted' } {
  if (status === 'accepted') return { label: 'Accepted', variant: 'success' };
  if (status === 'declined') return { label: 'Declined', variant: 'muted' };
  return { label: 'Waiting for a reply', variant: 'default' };
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function ConnectionsScreen() {
  const router = useRouter();
  const { show } = useToast();
  const q = useQuery({ queryKey: ['connections'], queryFn: () => connectionService.list(), refetchInterval: 8000 });
  // Which request is being answered, and how, so only that button spins.
  const [busy, setBusy] = useState<{ id: string; action: 'accept' | 'decline' } | null>(null);

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) {
    const err = q.error as { message?: string; code?: string } | null;
    return (
      <ScreenError
        message={err?.message ?? 'Your connections did not load. Check your connection and try again.'}
        code={err?.code}
        onRetry={() => q.refetch()}
      />
    );
  }

  const all = q.data ?? [];
  // Only a request still waiting can be answered. One already accepted is a connection.
  const waiting = all.filter((c) => c.direction === 'received' && c.status === 'pending');
  const connected = all.filter((c) => c.status === 'accepted');
  const sent = all.filter((c) => c.direction === 'sent' && c.status !== 'accepted');

  const accept = async (item: ConnectionJoinRequest) => {
    setBusy({ id: item.id, action: 'accept' });
    try {
      await connectionService.respond(item.id, true);
      // A plain request to connect proposes no money, so there is no deal to open.
      if (item.proposedAmountKes > 0) {
        const deal = await dealService.createInvestment(item.withUserId, 'Investment deal');
        await dealService.updateTerms(deal.id, { amountKes: item.proposedAmountKes, instrument: 'equity' });
        show(`You accepted ${item.withFullName}. Your deal is open.`, 'success');
        void q.refetch();
        router.push(`/deal/${deal.id}`);
      } else {
        show(`You are now connected with ${item.withFullName}.`, 'success');
        void q.refetch();
      }
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Could not accept the request. Try again.', 'error');
      void q.refetch();
    } finally {
      setBusy(null);
    }
  };

  const decline = async (item: ConnectionJoinRequest) => {
    setBusy({ id: item.id, action: 'decline' });
    try {
      await connectionService.respond(item.id, false, 'Not the right time');
      show(`You declined ${item.withFullName}'s request.`, 'success');
      void q.refetch();
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Could not decline the request. Try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Connections</Text>
      <Text style={styles.sub}>Investors who want to join you, and the people you already talk to.</Text>

      <Pressable
        style={({ pressed }) => [styles.chatRow, pressed && styles.pressed]}
        onPress={() => router.push('/conversations')}
        accessibilityRole="button"
        accessibilityLabel="Open your chats"
      >
        <View style={styles.chatIcon}>
          <MessageCircle size={20} color={colors.primary} />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.chatTitle}>Your chats</Text>
          <Text style={styles.meta}>Message the people you are connected with.</Text>
        </View>
        <ChevronRight size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Requests for you</Text>
          {waiting.length > 0 ? <Badge label={String(waiting.length)} variant="accent" /> : null}
        </View>

        {waiting.length === 0 ? (
          <View style={styles.empty}>
            <Inbox size={28} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No requests waiting</Text>
            <Text style={styles.emptyText}>
              When an investor asks to join your business, their pitch and the amount they propose show here for you to
              accept or decline.
            </Text>
            <Button title="See investors who fit" variant="secondary" onPress={() => router.push('/(founder)/(tabs)/matches')} style={styles.stretch} />
          </View>
        ) : (
          waiting.map((item) => {
            const hasAmount = item.proposedAmountKes > 0;
            const isBusy = busy?.id === item.id;
            return (
              <Card key={item.id} style={styles.card}>
                <View style={styles.person}>
                  <Avatar name={item.withFullName} size={44} />
                  <View style={styles.flexOne}>
                    <Text style={styles.name}>{item.withFullName}</Text>
                    {item.withOrganisationName ? <Text style={styles.meta}>{item.withOrganisationName}</Text> : null}
                  </View>
                  {when(item.createdAt) ? <Text style={styles.date}>{when(item.createdAt)}</Text> : null}
                </View>

                {hasAmount ? (
                  <View style={styles.amount}>
                    <Text style={styles.amountLabel}>Proposes to invest</Text>
                    <Text style={styles.amountValue}>{kes(item.proposedAmountKes)}</Text>
                  </View>
                ) : null}

                {item.pitch ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>{hasAmount ? 'Their pitch' : 'Their message'}</Text>
                    <Text style={styles.body}>{item.pitch}</Text>
                  </View>
                ) : null}
                {item.vision ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>How they see your business growing</Text>
                    <Text style={styles.body}>{item.vision}</Text>
                  </View>
                ) : null}
                {item.offer ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>What they offer</Text>
                    <Text style={styles.body}>{item.offer}</Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    title="Decline"
                    variant="secondary"
                    style={styles.flexOne}
                    disabled={isBusy}
                    loading={isBusy && busy?.action === 'decline'}
                    onPress={() => void decline(item)}
                  />
                  <Button
                    title="Accept"
                    style={styles.flexOne}
                    disabled={isBusy}
                    loading={isBusy && busy?.action === 'accept'}
                    onPress={() => void accept(item)}
                  />
                </View>
                <Text style={styles.fine}>
                  {hasAmount
                    ? 'Accepting connects you and opens a deal with this amount. Nothing is final until you both agree terms.'
                    : 'Accepting connects you, so you can chat.'}
                </Text>
              </Card>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected</Text>
        {connected.length === 0 ? (
          <Text style={styles.emptyLine}>
            Nobody yet. Once a request is accepted, by you or by them, the person shows here and you can chat.
          </Text>
        ) : (
          <Card style={styles.listCard}>
            {connected.map((item, i) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.listRow, i > 0 && styles.divider, pressed && styles.pressed]}
                onPress={() => router.push('/conversations')}
                accessibilityRole="button"
                accessibilityLabel={`Message ${item.withFullName}`}
              >
                <Avatar name={item.withFullName} size={40} />
                <View style={styles.flexOne}>
                  <Text style={styles.name}>{item.withFullName}</Text>
                  <Text style={styles.meta}>
                    {item.withOrganisationName ?? (item.focusAreas.length > 0 ? item.focusAreas.map(words).join(', ') : 'Connected')}
                  </Text>
                </View>
                <View style={styles.messageLink}>
                  <MessageCircle size={16} color={colors.primary} />
                  <Text style={styles.linkText}>Message</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requests you sent</Text>
        {sent.length === 0 ? (
          <Text style={styles.emptyLine}>
            Nothing waiting for a reply. When you press Connect on an investor, your request shows here until they
            answer.
          </Text>
        ) : (
          <Card style={styles.listCard}>
            {sent.map((item, i) => {
              const status = sentStatus(item.status);
              return (
                <View key={item.id} style={[styles.sentRow, i > 0 && styles.divider]}>
                  <View style={styles.sentTop}>
                    <Avatar name={item.withFullName} size={40} />
                    <View style={styles.flexOne}>
                      <Text style={styles.name}>{item.withFullName}</Text>
                      {item.withOrganisationName ? <Text style={styles.meta}>{item.withOrganisationName}</Text> : null}
                    </View>
                  </View>
                  <Badge label={status.label} variant={status.variant} />
                  {item.status === 'declined' && item.declineReason ? (
                    <Text style={styles.meta}>Their reason: {item.declineReason}</Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[2], paddingTop: spacing[1], paddingBottom: spacing[6] },
  flexOne: { flex: 1 },
  stretch: { alignSelf: 'stretch', marginTop: spacing[1] },
  pressed: { backgroundColor: colors.grey100 },

  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, fontWeight: '500', color: colors.textMuted, marginTop: spacing[0.5] },

  chatRow: {
    marginTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    padding: spacing[1.5],
    minHeight: touchTargetMin,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: { fontSize: 17, fontWeight: '700', color: colors.primaryDark },

  section: { marginTop: spacing[3], gap: spacing[1.5] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },

  empty: {
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[3],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
  emptyLine: { fontSize: 14, fontWeight: '500', color: colors.textMuted },

  card: { borderRadius: 16, gap: spacing[2] },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  date: { fontSize: 12, fontWeight: '600', color: colors.textMuted },

  amount: { padding: spacing[2], borderRadius: 12, backgroundColor: colors.primaryDark, gap: spacing[0.5] },
  amountLabel: { fontSize: 14, fontWeight: '600', color: '#D6E4FB' },
  amountValue: { fontSize: 24, fontWeight: '800', color: colors.white },

  block: { gap: spacing[0.5] },
  blockLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.text },

  actions: { flexDirection: 'row', gap: spacing[1.5] },
  fine: { fontSize: 14, fontWeight: '500', color: colors.textMuted },

  listCard: { borderRadius: 16, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    padding: spacing[2],
    minHeight: touchTargetMin,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  messageLink: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  linkText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  sentRow: { padding: spacing[2], gap: spacing[1] },
  sentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
});
