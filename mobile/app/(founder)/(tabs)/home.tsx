import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AiMark, Avatar, Button, Card, Eyebrow, Fit, SegmentBar, StageBar } from '../../../src/components/ui';
import { Column, Columns, Empty, Greeting } from '../../../src/components/overview/parts';
import { DEAL_STAGES, stageLabel } from '../../../src/components/deal/StageStepper';
import { greeting } from '../../../src/components/layout/workspace';
import {
  complianceService,
  connectionService,
  consentService,
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
import type { Deal, InvestorMatchCard, MatchBand } from '../../../src/types';

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

/**
 * The founder's home, as in the approved design, the same on a phone and
 * a computer: the greeting on deep purple, then her next step, how ready
 * she is, the people who may fund her, her deal room and the guide. On a
 * computer the same cards sit in two columns. Every place is named in words.
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
  // Matching is her choice: until she turns it on, no investors are suggested.
  const consentQ = useQuery({ queryKey: ['consents'], queryFn: () => consentService.list() });
  const matchingOff = consentQ.data ? !(consentQ.data.find((c) => c.purpose === 'ai_matching')?.granted ?? false) : false;
  const pull = usePullToRefresh(() =>
    Promise.all([profileQ.refetch(), matchesQ.refetch(), checklistQ.refetch(), dealsQ.refetch(), peopleQ.refetch()]),
  );

  const markDone = useMutation({
    mutationFn: (id: string) => complianceService.updateItemStatus(id, 'complete'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['compliance'] });
      void qc.invalidateQueries({ queryKey: ['funding-matches'] });
    },
  });

  const completeness = profileQ.data?.profileCompleteness ?? 0;
  const ready = matchesQ.data?.applyNow ?? [];
  const items = checklistQ.data ?? [];
  const done = items.filter((i) => i.status === 'complete').length;
  const nextItem = items.find((i) => i.status !== 'complete');
  const deals = dealsQ.data ?? [];
  const openDeals = deals.filter((d) => d.stage !== 'closed' && d.stage !== 'active');
  const deal = openDeals[0];
  const people = peopleQ.data ?? [];
  const asking = people.filter((c) => c.direction === 'received' && c.status === 'pending');
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

  // The same cards, in the same order, on a phone and on a computer.
  const nextCard = next ? (
    <Card style={styles.card}>
      <Eyebrow label="Your next step" />
      <Text style={styles.nextTitle}>{next.title}</Text>
      <Text style={styles.nextWhy}>{next.why}</Text>
      <View style={styles.twoButtons}>
        <Button title={next.primary.label} onPress={next.primary.go} style={styles.flex} />
        {next.secondary ? <Button title={next.secondary.label} variant="secondary" loading={next.secondary.busy} onPress={next.secondary.go} style={styles.flex} /> : null}
      </View>
    </Card>
  ) : null;

  const readyCard = items.length ? (
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
  ) : null;

  const peopleCard = (
    <Card style={styles.card}>
      <Text style={styles.label}>People who may fund you</Text>
      {matchingOff ? (
        <>
          <Empty text="Matching is off, so no investors are suggested yet. Turn it on and investors who fit your business appear here." />
          <Button title="Turn on matching" variant="soft" onPress={() => router.push('/settings/consents' as never)} style={styles.topGap} />
        </>
      ) : ready.length === 0 ? (
        <Empty text={matchesQ.isLoading ? 'Finding investors who fit…' : 'No investor fits your business yet. Check your profile is complete, or come back soon: new investors join every week.'} />
      ) : (
        ready.slice(0, wide ? 3 : 2).map((m, i) => (
          <Pressable key={m.investorUserId} onPress={() => openInvestor(m)} style={[styles.person, i > 0 && styles.personLine]} accessibilityRole="link">
            <Avatar name={nameOf(m)} uri={m.photoUrl} size={48} />
            <View style={styles.flex}>
              <Text style={styles.personName}>{nameOf(m)}</Text>
              <Text style={styles.sub}>{orgOf(m)}</Text>
              <Text style={styles.personLineText}>{reasonOf(m)}</Text>
              <Fit label={FIT[m.band].label} filled={FIT[m.band].filled} />
            </View>
          </Pressable>
        ))
      )}
      <Button title="See all investors" variant="soft" onPress={() => router.navigate('/matches' as never)} style={styles.topGap} />
    </Card>
  );

  const dealCard = deal ? (
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
  ) : null;

  const guideCard = (
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
  );

  const networkButton = <Button title="Your network" variant="soft" onPress={() => router.navigate('/connections' as never)} />;

  return (
    <ScrollView contentContainerStyle={wide ? styles.pageWide : styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Greeting hello={`${greeting()},`} name={first} />
      {wide ? (
        <Columns>
          <Column wide>
            {nextCard}
            {readyCard}
            {dealCard}
          </Column>
          <Column>
            {peopleCard}
            {guideCard}
            {networkButton}
          </Column>
        </Columns>
      ) : (
        <>
          {nextCard}
          {readyCard}
          {peopleCard}
          {dealCard}
          {guideCard}
          {networkButton}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  pageWide: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: 18 },
  card: { gap: 6 },
  label: { fontSize: 12, color: colors.textMuted },
  nextTitle: { fontSize: 18, color: colors.text, marginTop: 4 },
  nextWhy: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing[1] },
  twoButtons: { flexDirection: 'row', gap: 8 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  big: { fontSize: 34, color: colors.primaryDark, lineHeight: 36 },
  bigOf: { fontSize: 15, color: colors.textMuted },
  segGap: { marginVertical: 10 },
  small: { fontSize: 13, color: colors.textMuted },
  sub: { fontSize: 12.5, color: colors.textMuted },
  person: { flexDirection: 'row', gap: spacing[1.5], alignItems: 'flex-start', paddingTop: spacing[1.5] },
  personLine: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[1.5] },
  personName: { fontSize: 15, fontWeight: '500' },
  personLineText: { fontSize: 13, color: colors.text, marginTop: 4, marginBottom: 6 },
  topGap: { marginTop: spacing[1.5] },
  dealTitle: { fontSize: 16, color: colors.text },
  stageGap: { marginTop: 14, marginBottom: 10 },
});
