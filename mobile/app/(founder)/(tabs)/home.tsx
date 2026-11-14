import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AiMark, Avatar, Button, Card, Eyebrow, Fit, SegmentBar, StageBar } from '../../../src/components/ui';
import { Column, Columns, Empty, Greeting, Panel, Stat, Stats } from '../../../src/components/overview/parts';
import { DEAL_STAGES, stageLabel } from '../../../src/components/deal/StageStepper';
import { greeting } from '../../../src/components/layout/workspace';
import {
  complianceService,
  connectionService,
  conversationService,
  dealService,
  founderService,
  fundingService,
} from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { verificationInvite } from '../../../src/lib/verification-invite';
import { colors, spacing } from '../../../src/theme/tokens';
import { Text } from '../../../src/components/ui/Text';
import type { ConnectionJoinRequest, Deal, InvestorMatchCard, MatchBand } from '../../../src/types';

const FIT: Record<MatchBand, { label: string; filled: number }> = {
  strong: { label: 'Strong fit', filled: 3 },
  good: { label: 'Good fit', filled: 2 },
  possible: { label: 'Possible fit', filled: 1 },
  not_a_fit: { label: 'Not a fit', filled: 0 },
};

const nameOf = (m: InvestorMatchCard) => m.displayName;
// The firm under the name, unless it is the same (an angel network listed by its own name).
const orgOf = (m: InvestorMatchCard) =>
  m.anonymised ? 'Shown once you are verified' : m.organisationName && m.organisationName !== m.displayName ? m.organisationName : 'Investor';
const reasonOf = (m: InvestorMatchCard) => m.reasons.find((r) => r.fits)?.text ?? m.reasons[0]?.text ?? '';
const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;

interface NextStep {
  title: string;
  why: string;
  primary: { label: string; go: () => void };
  secondary?: { label: string; go: () => void; busy?: boolean };
}

/** Where she stands with one investor, in words, and what she can do. */
function standing(m: InvestorMatchCard, after: boolean, people: ConnectionJoinRequest[], deals: Deal[]) {
  if (deals.some((d) => d.withUserId === m.investorUserId && d.stage !== 'closed')) return { where: 'In the deal room', action: 'Open', primary: false };
  const link = people.find((c) => c.withUserId === m.investorUserId);
  if (link?.status === 'accepted') return { where: 'Connected', action: 'Message', primary: false };
  if (link?.status === 'pending') return link.direction === 'received' ? { where: 'Wants to connect', action: 'Reply', primary: true } : { where: 'Request sent', action: 'View', primary: false };
  if (after) return { where: m.gaps[0]?.text ?? 'One fix first', action: 'See the fix', primary: false };
  return { where: 'Not contacted', action: 'Request intro', primary: true };
}

/**
 * The founder's home, as in the approved design. On a computer: her
 * greeting, four numbers, the investors who fit her in a table, her next
 * step and her deal room. On a phone: the greeting on deep purple, then
 * her next step, how ready she is, the people who may fund her, and the
 * guide. Every place is named in words.
 */
export default function FounderHome() {
  const router = useRouter();
  const wide = useWideLayout();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const first = (user?.fullName ?? '').split(' ')[0];

  const profileQ = useQuery({ queryKey: ['founder-profile'], queryFn: () => founderService.getProfile() });
  const matchesQ = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches() });
  const checklistQ = useQuery({ queryKey: ['compliance'], queryFn: () => complianceService.listItems() });
  const dealsQ = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list() });
  const peopleQ = useQuery({ queryKey: ['connections'], queryFn: () => connectionService.list() });
  const chatsQ = useQuery({ queryKey: ['conversations'], queryFn: () => conversationService.list() });
  const pull = usePullToRefresh(() =>
    Promise.all([profileQ.refetch(), matchesQ.refetch(), checklistQ.refetch(), dealsQ.refetch(), peopleQ.refetch(), chatsQ.refetch()]),
  );

  const markDone = useMutation({
    mutationFn: (id: string) => complianceService.updateItemStatus(id, 'complete'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['compliance'] });
      void qc.invalidateQueries({ queryKey: ['funding-matches'] });
    },
  });

  const business = profileQ.data?.businessName;
  const completeness = profileQ.data?.profileCompleteness ?? 0;
  const ready = matchesQ.data?.applyNow ?? [];
  const after = matchesQ.data?.applyAfter ?? [];
  const items = checklistQ.data ?? [];
  const done = items.filter((i) => i.status === 'complete').length;
  const nextItem = items.find((i) => i.status !== 'complete');
  const deals = dealsQ.data ?? [];
  const openDeals = deals.filter((d) => d.stage !== 'closed' && d.stage !== 'active');
  const deal = openDeals[0];
  const people = peopleQ.data ?? [];
  const asking = people.filter((c) => c.direction === 'received' && c.status === 'pending');
  const chats = chatsQ.data ?? [];
  const unread = chats.reduce((n, c) => n + (c.unreadCount ?? 0), 0);
  const invite = verificationInvite(user?.approvalStatus, 'founder');
  const verified = user?.approvalStatus === 'approved';

  // The one thing to do next, in order of what unlocks most.
  const next: NextStep | null = !verified
    ? {
        title: invite?.title ?? 'Get verified to connect',
        why: invite?.text ?? 'Investors see who you are once a person at FoundersLink has checked you.',
        primary: { label: invite?.button ?? 'Verify now', go: () => router.push((invite?.route ?? '/founder/verify') as never) },
      }
    : asking.length > 0
      ? {
          title: `${asking[0].withOrganisationName ?? asking[0].withFullName} wants to connect`,
          why: asking[0].proposedAmountKes > 0 ? `They propose ${kes(asking[0].proposedAmountKes)}. Accept to start talking; a deal only follows if you both agree.` : 'Accept to start talking; a deal only follows if you both agree.',
          primary: { label: asking.length > 1 ? `See ${asking.length} requests` : 'See the request', go: () => router.navigate('/connections' as never) },
        }
      : nextItem
        ? {
            title: nextItem.label,
            why: nextItem.description ?? 'Investors check this before they put money in.',
            primary: { label: 'Show me how', go: () => router.navigate('/readiness' as never) },
            secondary: { label: "I've done this", go: () => markDone.mutate(nextItem.id), busy: markDone.isPending },
          }
        : completeness < 100
          ? {
              title: 'Finish your business profile',
              why: 'Investors read it before they decide to reach out.',
              primary: { label: 'Finish my profile', go: () => router.push('/founder/onboarding') },
            }
          : null;

  const openInvestor = (m: InvestorMatchCard) => router.push(`/founder/investor-match/${m.investorUserId}` as never);
  const openDeal = (d: Deal) => router.push(`/deal/${d.id}` as never);
  const dealIndex = deal ? Math.max(0, DEAL_STAGES.findIndex((s) => s.key === deal.stage)) : 0;

  const nextPanel = (
    <Panel title="Your next step">
      {next ? (
        <>
          <Text style={styles.nextTitle}>{next.title}</Text>
          <Text style={styles.nextWhy}>{next.why}</Text>
          <View style={styles.buttons}>
            <Button title={next.primary.label} size="sm" onPress={next.primary.go} />
            {next.secondary ? <Button title={next.secondary.label} size="sm" variant="secondary" loading={next.secondary.busy} onPress={next.secondary.go} /> : null}
          </View>
        </>
      ) : (
        <Empty text="Nothing waiting. Your business is ready for investors." />
      )}
    </Panel>
  );

  const dealPanel = deal ? (
    <Panel title="Deal room" link="All deal rooms" onLink={() => router.navigate('/deals' as never)}>
      <Pressable onPress={() => openDeal(deal)} accessibilityRole="link">
        <Text style={styles.dealTitle}>{deal.title}</Text>
        <View style={styles.stageGap}>
          <StageBar index={dealIndex} total={DEAL_STAGES.length} />
        </View>
        <Text style={styles.small}>
          {stageLabel(deal.stage)} · with {deal.withName}
          {deal.terms?.amountKes ? ` · ${kes(deal.terms.amountKes)} proposed` : ''}
        </Text>
      </Pressable>
    </Panel>
  ) : null;

  if (wide) {
    const rows = [...ready.map((m) => ({ m, after: false })), ...after.map((m) => ({ m, after: true }))].slice(0, 6);
    return (
      <ScrollView contentContainerStyle={styles.pageWide} refreshControl={<RefreshControl {...pull} />}>
        <Greeting
          hello={`${greeting()},`}
          name={first}
          line={ready.length ? `${ready.length} investor${ready.length > 1 ? 's are' : ' is'} ready for your pitch.` : 'Here is where your business stands today.'}
          actions={
            <>
              <Button title="Ask the Co-pilot" size="sm" variant="secondary" onPress={() => router.navigate('/copilot' as never)} />
              <Button title="Find investors" size="sm" onPress={() => router.navigate('/matches' as never)} />
            </>
          }
        />

        <Stats>
          <Stat label="Getting ready" value={String(done)} of={items.length ? `of ${items.length}` : undefined} note={nextItem ? `${nextItem.label} is next` : 'All done'} onPress={() => router.navigate('/readiness' as never)} />
          <Stat label="Ready to pitch" value={String(ready.length)} note={after.length ? `${after.length} more after one fix` : 'Matches update as you go'} onPress={() => router.navigate('/matches' as never)} />
          <Stat label="Conversations" value={String(chats.length)} note={unread ? `${unread} waiting for you` : 'All read'} onPress={() => router.navigate('/conversations' as never)} />
          <Stat label="Deal in progress" value={String(openDeals.length)} note={deal ? stageLabel(deal.stage) : 'None yet'} onPress={() => router.navigate('/deals' as never)} />
        </Stats>

        <Columns>
          <Column wide>
            <Panel title={`Investors who fit ${business ?? 'your business'}`} link={`View all ${ready.length + after.length}`} onLink={() => router.navigate('/matches' as never)}>
              {rows.length === 0 ? (
                <Empty text={matchesQ.isLoading ? 'Finding investors who fit…' : 'Investors who fit your business appear here once your profile is in.'} />
              ) : (
                <View>
                  <View style={[styles.tr, styles.thRow]}>
                    <Text style={[styles.th, styles.cWho]}>Investor</Text>
                    <Text style={[styles.th, styles.cWhy]}>Why they fit</Text>
                    <Text style={[styles.th, styles.cFit]}>Fit</Text>
                    <Text style={[styles.th, styles.cWhere]}>Where you are</Text>
                    <View style={styles.cAct} />
                  </View>
                  {rows.map(({ m, after: isAfter }, i) => {
                    const s = standing(m, isAfter, people, deals);
                    const f = FIT[m.band];
                    return (
                      <View key={m.investorUserId} style={[styles.tr, i < rows.length - 1 && styles.trLine]}>
                        <Pressable style={[styles.cWho, styles.who]} onPress={() => openInvestor(m)} accessibilityRole="link">
                          <Avatar name={nameOf(m)} size={40} />
                          <View style={styles.flex}>
                            <Text style={styles.td} numberOfLines={1}>{nameOf(m)}</Text>
                            <Text style={styles.tdSub} numberOfLines={1}>{orgOf(m)}</Text>
                          </View>
                        </Pressable>
                        <Text style={[styles.td, styles.cWhy, styles.muted]} numberOfLines={2}>{reasonOf(m)}</Text>
                        <View style={styles.cFit}>
                          <Fit label={isAfter ? 'One fix' : f.label.replace(' fit', '')} filled={isAfter ? 1 : f.filled} fix={isAfter} />
                        </View>
                        <Text style={[styles.tdSmall, styles.cWhere]} numberOfLines={2}>{s.where}</Text>
                        <View style={styles.cAct}>
                          <Button title={s.action} size="sm" variant={s.primary ? 'primary' : 'secondary'} onPress={() => openInvestor(m)} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Panel>
          </Column>
          <Column>
            {nextPanel}
            {dealPanel}
          </Column>
        </Columns>
      </ScrollView>
    );
  }

  // ---------------- Phone ----------------
  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Greeting hello={`${greeting()},`} name={first} />

      {next ? (
        <Card style={styles.card}>
          <Eyebrow label="Your next step" />
          <Text style={styles.nextTitle}>{next.title}</Text>
          <Text style={styles.nextWhy}>{next.why}</Text>
          <View style={styles.twoButtons}>
            <Button title={next.primary.label} onPress={next.primary.go} style={styles.flex} />
            {next.secondary ? <Button title={next.secondary.label} variant="secondary" loading={next.secondary.busy} onPress={next.secondary.go} style={styles.flex} /> : null}
          </View>
        </Card>
      ) : null}

      {items.length ? (
        <Pressable onPress={() => router.navigate('/readiness' as never)} accessibilityRole="link">
          <Card style={styles.card}>
            <Text style={styles.label}>Getting ready</Text>
            <View style={styles.bigRow}>
              <Text style={styles.big}>{done}</Text>
              <Text style={styles.bigOf}>/ {items.length}</Text>
            </View>
            <SegmentBar done={done} total={items.length} style={styles.segGap} />
            <Text style={styles.small}>
              {done} of {items.length} things investors look for.
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>People who may fund you</Text>
        {ready.length === 0 ? (
          <Empty text={matchesQ.isLoading ? 'Finding investors who fit…' : 'Investors who fit your business appear here once your profile is in.'} />
        ) : (
          ready.slice(0, 2).map((m, i) => (
            <Pressable key={m.investorUserId} onPress={() => openInvestor(m)} style={[styles.person, i > 0 && styles.personLine]} accessibilityRole="link">
              <Avatar name={nameOf(m)} size={48} />
              <View style={styles.flex}>
                <Text style={styles.personName}>{nameOf(m)}</Text>
                <Text style={styles.tdSub}>{orgOf(m)}</Text>
                <Text style={styles.personLineText}>{reasonOf(m)}</Text>
                <Fit label={FIT[m.band].label} filled={FIT[m.band].filled} />
              </View>
            </Pressable>
          ))
        )}
        <Button title="See all investors" variant="soft" onPress={() => router.navigate('/matches' as never)} style={styles.topGap} />
      </Card>

      {deal ? (
        <Pressable onPress={() => openDeal(deal)} accessibilityRole="link">
          <Card style={styles.card}>
            <Text style={styles.label}>Deal room</Text>
            <Text style={styles.dealTitle}>{deal.title}</Text>
            <View style={styles.stageGap}>
              <StageBar index={dealIndex} total={DEAL_STAGES.length} />
            </View>
            <Text style={styles.small}>
              {stageLabel(deal.stage)} · with {deal.withName}
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.person}>
          <AiMark size={40} />
          <View style={styles.flex}>
            <Text style={styles.personName}>Ask the guide</Text>
            <Text style={styles.small}>Not sure what to do? Ask in your own words.</Text>
          </View>
        </View>
        <Button title="Ask a question" onPress={() => router.navigate('/copilot' as never)} style={styles.topGap} />
      </Card>

      <Button title="Your network" variant="soft" onPress={() => router.navigate('/connections' as never)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  pageWide: { paddingBottom: spacing[6], gap: 18 },
  card: { gap: 6 },
  label: { fontSize: 12, color: colors.textMuted },
  nextTitle: { fontSize: 18, color: colors.text, marginTop: 4 },
  nextWhy: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing[1] },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  twoButtons: { flexDirection: 'row', gap: 8 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  big: { fontSize: 34, color: colors.primaryDark, lineHeight: 36 },
  bigOf: { fontSize: 15, color: colors.textMuted },
  segGap: { marginVertical: 10 },
  small: { fontSize: 13, color: colors.textMuted },
  muted: { color: colors.textMuted },
  person: { flexDirection: 'row', gap: spacing[1.5], alignItems: 'flex-start', paddingTop: spacing[1.5] },
  personLine: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[1.5] },
  personName: { fontSize: 15, fontWeight: '500' },
  personLineText: { fontSize: 13, color: colors.text, marginTop: 4, marginBottom: 6 },
  topGap: { marginTop: spacing[1.5] },
  dealTitle: { fontSize: 16, color: colors.text },
  stageGap: { marginTop: 14, marginBottom: 10 },

  // The investors table on a computer.
  tr: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 13 },
  thRow: { paddingTop: 0, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  trLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontSize: 12, color: colors.textDim },
  td: { fontSize: 14, color: colors.text },
  tdSub: { fontSize: 12.5, color: colors.textMuted },
  tdSmall: { fontSize: 13, color: colors.textMuted },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  cWho: { flex: 3, minWidth: 150 },
  cWhy: { flex: 1.8, minWidth: 0 },
  cFit: { width: 118 },
  cWhere: { flex: 1.5, minWidth: 0 },
  cAct: { width: 112, alignItems: 'flex-end' },
});
