import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Eyebrow, Fit } from '../../../src/components/ui';
import { Column, Columns, Empty, Greeting, kes, Panel, Row, Stat, Stats, Tag } from '../../../src/components/overview/parts';
import { stageLabel } from '../../../src/components/deal/StageStepper';
import { greeting } from '../../../src/components/layout/workspace';
import { dealService, investorService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { verificationInvite } from '../../../src/lib/verification-invite';
import { colors, spacing } from '../../../src/theme/tokens';
import { Text } from '../../../src/components/ui/Text';
import type { MatchBand } from '../../../src/types';

const FIT: Record<MatchBand, { label: string; filled: number }> = {
  strong: { label: 'Strong fit', filled: 3 },
  good: { label: 'Good fit', filled: 2 },
  possible: { label: 'Possible fit', filled: 1 },
  not_a_fit: { label: 'Not a fit', filled: 0 },
};

const REQUEST = {
  pending: { label: 'Deciding', tone: 'quiet' as const },
  accepted: { label: 'Connected', tone: 'done' as const },
  declined: { label: 'Declined', tone: 'quiet' as const },
};

// Option ids as words: "early_revenue" is "Early revenue", "mvp" is "MVP".
const words = (id: string) => (id === 'mvp' ? 'MVP' : (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' '));

/**
 * The investor's home, in the approved design: what needs her first, the
 * businesses that fit what she funds, where her requests stand, and her
 * deals. Money moves between banks; FoundersLink keeps the record.
 */
export default function InvestorOverview() {
  const router = useRouter();
  const wide = useWideLayout();
  const user = useAuthStore((s) => s.user);
  const first = (user?.fullName ?? '').split(' ')[0];

  const setupQ = useQuery({ queryKey: ['investor-setup'], queryFn: () => investorService.getSetup() });
  const discoverQ = useQuery({ queryKey: ['discover', {}], queryFn: () => investorService.discover() });
  const requestsQ = useQuery({ queryKey: ['join-requests'], queryFn: () => investorService.getJoinRequests() });
  const dealsQ = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list() });
  const pull = usePullToRefresh(() => Promise.all([setupQ.refetch(), discoverQ.refetch(), requestsQ.refetch(), dealsQ.refetch()]));

  const setup = setupQ.data;
  const founders = discoverQ.data?.founders ?? [];
  const fits = founders.filter((f) => f.band === 'strong' || f.band === 'good');
  const requests = requestsQ.data ?? [];
  const waiting = requests.filter((r) => r.status === 'pending');
  const connected = requests.filter((r) => r.status === 'accepted');
  const deals = dealsQ.data ?? [];
  const openDeals = deals.filter((d) => d.stage !== 'closed' && d.stage !== 'active');
  const backed = deals.filter((d) => d.stage === 'closed' || d.stage === 'active');
  const backedTotal = backed.reduce((n, d) => n + (d.terms?.amountKes ?? 0), 0);
  const verified = user?.approvalStatus === 'approved';
  const invite = verificationInvite(user?.approvalStatus, 'investor');

  // What needs her first.
  const attention = !setup
    ? { title: 'Say what you fund', why: 'Sectors, stages, counties and ticket size. The businesses that fit appear as soon as you do.', button: 'Set up my fund', go: () => router.push('/investor/onboarding') }
    : !verified
      ? { title: invite?.title ?? 'Get verified to connect', why: invite?.text ?? 'Founders see who you are once a person at FoundersLink has checked you.', button: invite?.button ?? 'Verify now', go: () => router.push((invite?.route ?? '/founder/verify') as never) }
      : openDeals[0]
        ? { title: openDeals[0].title, why: `${stageLabel(openDeals[0].stage)} with ${openDeals[0].withName}. See what is waiting in the deal room.`, button: 'Open the deal room', go: () => router.push(`/deal/${openDeals[0].id}` as never), person: openDeals[0].withName }
        : null;

  const openFounder = (id: string | null) => (id ? () => router.push(`/investor/founder/${id}` as never) : undefined);

  if (wide) {
    return (
      <ScrollView contentContainerStyle={styles.pageWide} refreshControl={<RefreshControl {...pull} />}>
        <Greeting
          hello={`${greeting()},`}
          name={first}
          line={setup ? `${fits.length} business${fits.length === 1 ? '' : 'es'} fit ${setup.organisationName}.` : 'Tell us what you fund, and we will find the businesses that fit.'}
          actions={
            <>
              <Button title="Your requests" size="sm" variant="secondary" onPress={() => router.navigate('/requests' as never)} />
              <Button title="Find businesses" size="sm" onPress={() => router.navigate('/discover' as never)} />
            </>
          }
        />
        <Stats>
          <Stat label="Businesses that fit" value={String(fits.length)} note={founders.length ? `${founders.length} looked at` : 'Matches appear here'} onPress={() => router.navigate('/discover' as never)} />
          <Stat label="Requests waiting" value={String(waiting.length)} note={waiting.length ? 'Founders are deciding' : 'None waiting'} onPress={() => router.navigate('/requests' as never)} />
          <Stat label="Connected" value={String(connected.length)} note={connected.length ? 'You can talk' : 'No connections yet'} onPress={() => router.navigate('/conversations' as never)} />
          <Stat label="Your investments" value={String(backed.length)} note={backedTotal ? kes(backedTotal) : 'None closed yet'} onPress={() => router.navigate('/investments' as never)} />
        </Stats>
        <Columns>
          <Column wide>
            <Panel title="Businesses for you" link="See all" onLink={() => router.navigate('/discover' as never)}>
              {!setup ? (
                <Empty text="Say which sectors, stages and amounts you fund, and the businesses that fit appear here." />
              ) : founders.length === 0 ? (
                <Empty text={discoverQ.isLoading ? 'Finding businesses that fit…' : 'No businesses fit yet. New founders join every week.'} />
              ) : (
                founders.slice(0, 5).map((f, i, all) => (
                  <Row
                    key={f.id ?? f.headline}
                    person={f.founderName ?? f.businessName ?? words(f.sector)}
                    title={f.businessName ?? f.headline}
                    line={f.matchReasons[0] ?? `${words(f.sector)} · ${f.county}`}
                    right={<Fit label={FIT[f.band].label} filled={FIT[f.band].filled} />}
                    onPress={openFounder(f.id)}
                    last={i === all.length - 1}
                  />
                ))
              )}
            </Panel>
          </Column>
          <Column>
            {attention ? (
              <Panel title="Needs your attention">
                <Text style={styles.attTitle}>{attention.title}</Text>
                <Text style={styles.attWhy}>{attention.why}</Text>
                <Button title={attention.button} size="sm" onPress={attention.go} style={styles.start} />
              </Panel>
            ) : null}
            <Panel title="Your requests" link="All requests" onLink={() => router.navigate('/requests' as never)}>
              {requests.length === 0 ? (
                <Empty text="Send a founder a request from their page, with the amount you have in mind." />
              ) : (
                requests.slice(0, 4).map((r, i, all) => (
                  <Row
                    key={r.id}
                    person={r.founderName}
                    title={r.founderName}
                    line={r.proposedAmountKes > 0 ? `You proposed ${kes(r.proposedAmountKes)}` : 'Asked to connect'}
                    right={<Tag label={REQUEST[r.status].label} tone={REQUEST[r.status].tone} />}
                    onPress={() => router.navigate('/requests' as never)}
                    last={i === all.length - 1}
                  />
                ))
              )}
            </Panel>
            {setup ? (
              <Panel title="What you fund" link="Edit" onLink={() => router.push('/investor/onboarding')}>
                <Text style={styles.fund}>{setup.sectors.map(words).join(', ')} · {setup.stages.map(words).join(', ')}</Text>
                <Text style={styles.muted}>{kes(setup.ticketMinKes)} to {kes(setup.ticketMaxKes)} per business</Text>
              </Panel>
            ) : null}
          </Column>
        </Columns>
        <Text style={styles.footnote}>Money moves between your bank and the founder's. FoundersLink records the deal, never the money.</Text>
      </ScrollView>
    );
  }

  // ---------------- Phone ----------------
  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Greeting hello={`${greeting()},`} name={first} />

      {attention ? (
        <Card style={[styles.card, styles.attCard]}>
          <Eyebrow label="Needs your attention" />
          <View style={styles.person}>
            {attention.person ? <Avatar name={attention.person} size={44} /> : null}
            <View style={styles.flex}>
              <Text style={styles.attTitle}>{attention.title}</Text>
              <Text style={styles.attWhy}>{attention.why}</Text>
            </View>
          </View>
          <Button title={attention.button} onPress={attention.go} />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>Your investments</Text>
        <Text style={styles.money}>{backedTotal ? kes(backedTotal) : 'None closed yet'}</Text>
        {backed.length ? (
          <View style={styles.faces}>
            {backed.slice(0, 5).map((d, i) => (
              <View key={d.id} style={i > 0 && styles.overlap}>
                <Avatar name={d.withName} size={34} />
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.small}>
          {backed.length ? `${backed.length} business${backed.length === 1 ? '' : 'es'} backed through FoundersLink.` : 'Closed deals appear here, with how each business is doing.'}
        </Text>
        <Button title="See my investments" variant="soft" onPress={() => router.navigate('/investments' as never)} style={styles.topGap} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{fits.length ? `${fits.length} business${fits.length === 1 ? '' : 'es'} fit what you fund` : 'Businesses for you'}</Text>
        <Text style={styles.small}>
          {setup ? `${setup.sectors.map(words).join(', ')}, ${kes(setup.ticketMinKes)} to ${kes(setup.ticketMaxKes)}.` : 'Say what you fund to see who fits.'}
        </Text>
        <Button title={setup ? 'See businesses' : 'Set up my fund'} variant="soft" onPress={() => (setup ? router.navigate('/discover' as never) : router.push('/investor/onboarding'))} style={styles.topGap} />
      </Card>

      {waiting.length ? (
        <Card style={styles.card}>
          <View style={styles.person}>
            <Avatar name={waiting[0].founderName} size={40} />
            <Text style={[styles.cardTitle, styles.flex]}>
              {waiting.length === 1 ? `${waiting[0].founderName} is deciding on your request.` : `${waiting.length} founders are deciding on your requests.`}
            </Text>
          </View>
          <Button title="See requests" variant="secondary" onPress={() => router.navigate('/requests' as never)} style={styles.topGap} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  pageWide: { paddingBottom: spacing[6], gap: 18 },
  card: { gap: 6 },
  attCard: { borderColor: 'rgba(227,182,93,0.55)' },
  attTitle: { fontSize: 17, color: colors.text },
  attWhy: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing[1] },
  person: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  label: { fontSize: 12, color: colors.textMuted },
  money: { fontSize: 24, color: colors.primaryDark },
  faces: { flexDirection: 'row', marginVertical: 6 },
  overlap: { marginLeft: -10 },
  small: { fontSize: 13, color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  cardTitle: { fontSize: 16, color: colors.text },
  topGap: { marginTop: spacing[1.5] },
  start: { alignSelf: 'flex-start' },
  fund: { fontSize: 15, color: colors.text },
  footnote: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing[1] },
});
