import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Compass, FileSignature, Send, ShieldCheck, Target } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { Column, Columns, Empty, Greeting, initialsOf, kes, Panel, Row, Stat, Stats, Tag } from '../../../src/components/overview/parts';
import { greeting } from '../../../src/components/layout/workspace';
import { dealService, investorService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { verificationInvite } from '../../../src/lib/verification-invite';
import { colors, spacing } from '../../../src/theme/tokens';
import type { MatchBand } from '../../../src/types';

const BAND: Record<MatchBand, { label: string; tone: 'new' | 'todo' | 'waiting' | 'done' }> = {
  strong: { label: 'Strong fit', tone: 'new' },
  good: { label: 'Good fit', tone: 'todo' },
  possible: { label: 'Possible fit', tone: 'waiting' },
  not_a_fit: { label: 'Not a fit', tone: 'waiting' },
};

const REQUEST = {
  pending: { label: 'Waiting', tone: 'waiting' as const },
  accepted: { label: 'Connected', tone: 'done' as const },
  declined: { label: 'Declined', tone: 'todo' as const },
};

// Option ids as words: "early_revenue" is "Early revenue", "mvp" is "MVP".
const words = (id: string) => (id === 'mvp' ? 'MVP' : (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' '));

/**
 * The investor's home: the businesses that fit what she funds, where her
 * requests stand, and her deals.
 */
export default function InvestorOverview() {
  const router = useRouter();
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
  const openDeals = (dealsQ.data ?? []).filter((d) => d.stage !== 'closed');
  const verified = user?.approvalStatus === 'approved';
  const invite = verificationInvite(user?.approvalStatus, 'investor');

  const next = !setup
    ? { title: 'Say what you fund', go: () => router.push('/investor/onboarding') }
    : !verified
      ? { title: invite?.button ?? 'Verify to connect', go: () => router.push((invite?.route ?? '/founder/verify') as never) }
      : { title: 'Find businesses', go: () => router.navigate('/discover' as never) };

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Greeting
        eyebrow="Investor workspace"
        art="meet"
        title={`${greeting()}${first ? `, ${first}` : ''}`}
        line={setup ? `Businesses that fit ${setup.organisationName}, and where your conversations stand.` : 'Tell us what you fund, and we will find the businesses that fit.'}
        action={<Button title={next.title} onPress={next.go} />}
      />

      <Stats>
        <Stat label="Businesses that fit" value={String(fits.length)} note={founders.length ? `${founders.length} looked at` : 'Matches appear here'} icon={Compass} onPress={() => router.navigate('/discover' as never)} />
        <Stat label="Requests waiting" value={String(waiting.length)} note={waiting.length ? 'Founders are deciding' : 'None waiting'} icon={Send} onPress={() => router.navigate('/requests' as never)} />
        <Stat label="Connected" value={String(connected.length)} note={connected.length ? 'You can talk' : 'No connections yet'} icon={Briefcase} onPress={() => router.push('/conversations')} />
        <Stat label="Open deals" value={String(openDeals.length)} note={openDeals.length ? 'In progress' : 'None yet'} icon={FileSignature} onPress={() => router.navigate('/requests' as never)} />
      </Stats>

      <Columns>
        <Column wide>
          {!verified && setup ? (
            <Panel title={invite?.title ?? 'Verify to connect'} sub={invite?.text}>
              <Row icon={ShieldCheck} title="Verification" line="Founders see who you are once a person at FoundersLink has checked you." right={<Tag label="First" tone="new" />} onPress={next.go} last />
            </Panel>
          ) : null}

          <Panel title="Businesses for you" sub="Sorted by how well they fit what you fund." link="See all" onLink={() => router.navigate('/discover' as never)}>
            {!setup ? (
              <Empty text="Say which sectors, stages and amounts you fund, and the businesses that fit appear here." />
            ) : founders.length === 0 ? (
              <Empty text={discoverQ.isLoading ? 'Finding businesses that fit…' : 'No businesses fit yet. New founders join every week.'} />
            ) : (
              founders.slice(0, 4).map((f, i, all) => (
                <Row
                  key={f.id ?? f.headline}
                  initials={initialsOf(f.businessName ?? words(f.sector))}
                  title={f.businessName ?? f.headline}
                  line={f.matchReasons[0] ?? `${words(f.sector)} · ${f.county}`}
                  right={<Tag label={BAND[f.band].label} tone={BAND[f.band].tone} />}
                  onPress={f.id ? () => router.push(`/investor/founder/${f.id}` as never) : undefined}
                  last={i === all.length - 1}
                />
              ))
            )}
          </Panel>
        </Column>

        <Column>
          <Panel title="Your requests" sub="The founders you asked to connect with." link="All requests" onLink={() => router.navigate('/requests' as never)}>
            {requests.length === 0 ? (
              <Empty text="Send a founder a request from their page, with the amount you have in mind." />
            ) : (
              requests.slice(0, 4).map((r, i, all) => (
                <Row
                  key={r.id}
                  initials={initialsOf(r.founderName)}
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
            <Panel title="What you fund" sub={setup.organisationName} link="Edit" onLink={() => router.push('/investor/onboarding')}>
              <View style={styles.fund}>
                <Target size={18} color={colors.primary} />
                <Text style={styles.fundText}>
                  {setup.sectors.map(words).join(', ')} · {setup.stages.map(words).join(', ')}
                </Text>
              </View>
              <Text style={styles.fundTicket}>
                {kes(setup.ticketMinKes)} to {kes(setup.ticketMaxKes)} per business
              </Text>
            </Panel>
          ) : null}
        </Column>
      </Columns>

      <Text style={styles.footnote}>Money moves between your bank and the founder&apos;s. FoundersLink records the deal, never the money.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[2] },
  fund: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingTop: spacing[0.5] },
  fundText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  fundTicket: { fontSize: 14, color: colors.textMuted },
  footnote: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing[1] },
});
