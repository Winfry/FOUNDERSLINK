import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, FileSignature, Gauge, HandCoins, Handshake, ShieldCheck, UserRoundPen, UsersRound } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/ui';
import { Column, Columns, Empty, Greeting, initialsOf, kes, Panel, Progress, Row, Stat, Stats, Tag } from '../../../src/components/overview/parts';
import { greeting } from '../../../src/components/layout/workspace';
import { circleService, complianceService, connectionService, dealService, founderService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { verificationInvite } from '../../../src/lib/verification-invite';
import { spacing } from '../../../src/theme/tokens';
import { Text } from '../../../src/components/ui/Text';
import type { MatchBand } from '../../../src/types';

const BAND: Record<MatchBand, { label: string; tone: 'new' | 'todo' | 'waiting' | 'done' }> = {
  strong: { label: 'Strong fit', tone: 'new' },
  good: { label: 'Good fit', tone: 'todo' },
  possible: { label: 'Possible fit', tone: 'waiting' },
  not_a_fit: { label: 'Not a fit', tone: 'waiting' },
};

/**
 * The founder's home: where she stands today and the next thing to do,
 * with the investors who fit her, her requests and her chamas.
 */
export default function FounderHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const first = (user?.fullName ?? '').split(' ')[0];

  const profileQ = useQuery({ queryKey: ['founder-profile'], queryFn: () => founderService.getProfile() });
  const matchesQ = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches() });
  const checklistQ = useQuery({ queryKey: ['compliance'], queryFn: () => complianceService.listItems() });
  const dealsQ = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list() });
  const peopleQ = useQuery({ queryKey: ['connections'], queryFn: () => connectionService.list() });
  const chamasQ = useQuery({ queryKey: ['circles'], queryFn: () => circleService.list() });
  const pull = usePullToRefresh(() =>
    Promise.all([profileQ.refetch(), matchesQ.refetch(), checklistQ.refetch(), dealsQ.refetch(), peopleQ.refetch(), chamasQ.refetch()]),
  );

  const completeness = profileQ.data?.profileCompleteness ?? 0;
  const fits = [...(matchesQ.data?.applyNow ?? []), ...(matchesQ.data?.applyAfter ?? [])];
  const items = checklistQ.data ?? [];
  const done = items.filter((i) => i.status === 'complete').length;
  const toDo = items.filter((i) => i.status !== 'complete').slice(0, 3);
  const openDeals = (dealsQ.data ?? []).filter((d) => d.stage !== 'closed');
  const waitingForMe = (peopleQ.data ?? []).filter((c) => c.direction === 'received' && c.status === 'pending');
  const invite = verificationInvite(user?.approvalStatus, 'founder');
  const verified = user?.approvalStatus === 'approved';

  // The one thing to do next, in order of what unlocks most.
  const next = !verified
    ? { title: invite?.button ?? 'Verify to connect', go: () => router.push((invite?.route ?? '/founder/verify') as never) }
    : waitingForMe.length > 0
      ? { title: `Answer ${waitingForMe.length} request${waitingForMe.length > 1 ? 's' : ''}`, go: () => router.navigate('/connections' as never) }
      : completeness < 100
        ? { title: 'Complete my business profile', go: () => router.push('/founder/onboarding') }
        : { title: 'See investors who fit', go: () => router.navigate('/matches' as never) };

  const line = profileQ.data?.businessName
    ? `Here is where ${profileQ.data.businessName} stands today, and what to do next.`
    : 'Here is where your business stands today, and what to do next.';

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Greeting
        eyebrow="Founder workspace"
        title={`${greeting()}${first ? `, ${first}` : ''}`}
        line={line}
        action={<Button title={next.title} onPress={next.go} />}
      />

      <Stats>
        <Stat label="Business profile" value={`${completeness}%`} note={completeness >= 100 ? 'Complete' : 'Keep building it'} icon={Gauge} onPress={() => router.push('/founder/onboarding')} />
        <Stat label="Investors who fit" value={String(fits.length)} note={fits.length ? 'Pitch or fix first' : 'Matches appear here'} icon={Handshake} onPress={() => router.navigate('/matches' as never)} />
        <Stat label="Readiness" value={items.length ? `${done} of ${items.length}` : '—'} note={items.length - done > 0 ? `${items.length - done} left to do` : 'All done'} icon={ClipboardCheck} onPress={() => router.navigate('/readiness' as never)} />
        <Stat label="Open deals" value={String(openDeals.length)} note={openDeals.length ? 'In progress' : 'None yet'} icon={FileSignature} onPress={() => router.navigate('/connections' as never)} />
      </Stats>

      <Columns>
        <Column wide>
          <Panel title="Your next steps" sub="Each one you finish opens the door to more investors." link="Checklist" onLink={() => router.navigate('/readiness' as never)}>
            <View style={styles.readiness}>
              <View style={styles.readinessHead}>
                <Text style={styles.readinessTitle}>Investor readiness</Text>
                <Text style={styles.readinessPct}>{items.length ? Math.round((done / items.length) * 100) : 0}%</Text>
              </View>
              <Progress value={items.length ? (done / items.length) * 100 : 0} />
            </View>
            {!verified ? (
              <Row icon={ShieldCheck} title={invite?.title ?? 'Verify to connect'} line={invite?.text} right={<Tag label="First" tone="new" />} onPress={next.go} />
            ) : null}
            {completeness < 100 ? (
              <Row icon={UserRoundPen} title="Finish your business profile" line="Investors read it before they decide to reach out." right={<Tag label={`${completeness}%`} tone="waiting" />} onPress={() => router.push('/founder/onboarding')} />
            ) : null}
            {toDo.map((item, i) => (
              <Row
                key={item.id}
                icon={ClipboardCheck}
                title={item.label}
                line={item.description}
                right={<Tag label={item.status === 'in_progress' ? 'In progress' : 'To do'} tone={item.status === 'in_progress' ? 'waiting' : 'todo'} />}
                onPress={() => router.navigate('/readiness' as never)}
                last={i === toDo.length - 1}
              />
            ))}
            {verified && completeness >= 100 && toDo.length === 0 ? <Empty text="Nothing waiting. Your business is ready for investors." /> : null}
          </Panel>

          {waitingForMe.length > 0 ? (
            <Panel title="Investors who want to connect" sub="Accept to start talking. You choose whether a deal follows." link="Network" onLink={() => router.navigate('/connections' as never)}>
              {waitingForMe.slice(0, 3).map((r, i, all) => (
                <Row
                  key={r.id}
                  initials={initialsOf(r.withFullName)}
                  title={r.withOrganisationName ?? r.withFullName}
                  line={r.proposedAmountKes > 0 ? `Proposes ${kes(r.proposedAmountKes)}` : 'Wants to connect'}
                  right={<Tag label="New" tone="new" />}
                  onPress={() => router.navigate('/connections' as never)}
                  last={i === all.length - 1}
                />
              ))}
            </Panel>
          ) : null}
        </Column>

        <Column>
          <Panel title="Investors for you" sub="Sorted by how well they fit your business." link="See all" onLink={() => router.navigate('/matches' as never)}>
            {fits.length === 0 ? (
              <Empty text={matchesQ.isLoading ? 'Finding investors who fit…' : 'Investors who fit your business appear here once your profile is in.'} />
            ) : (
              fits.slice(0, 3).map((m, i, all) => (
                <Row
                  key={m.investorUserId}
                  initials={initialsOf(m.organisationName ?? m.displayName)}
                  title={m.anonymised ? m.displayName : (m.organisationName ?? m.displayName)}
                  line={m.reasons.find((r) => r.fits)?.text}
                  right={<Tag label={BAND[m.band].label} tone={BAND[m.band].tone} />}
                  onPress={() => router.push(`/founder/investor-match/${m.investorUserId}` as never)}
                  last={i === all.length - 1}
                />
              ))
            )}
          </Panel>

          <Panel title="Your chamas" sub="Save with founders you trust. FoundersLink keeps the records." link="Chamas" onLink={() => router.navigate('/chamas' as never)}>
            {(chamasQ.data ?? []).length === 0 ? (
              <Empty text="You are not in a chama yet. Start one and invite founders you trust." />
            ) : (
              (chamasQ.data ?? []).slice(0, 3).map((c, i, all) => (
                <Row
                  key={c.id}
                  icon={c.type === 'money' ? HandCoins : UsersRound}
                  title={c.name}
                  line={`${c.memberCount} members · ${c.type === 'money' ? 'Savings' : 'Learning'}`}
                  onPress={() => router.push(`/chama/${c.id}` as never)}
                  last={i === all.length - 1}
                />
              ))
            )}
          </Panel>
        </Column>
      </Columns>

      <Text style={styles.footnote}>FoundersLink records what you agree and pay. It never holds or moves your money.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[2] },
  readiness: { gap: spacing[1], paddingVertical: spacing[1] },
  readinessHead: { flexDirection: 'row', justifyContent: 'space-between' },
  readinessTitle: { fontSize: 14, fontWeight: '700' },
  readinessPct: { fontSize: 14, fontWeight: '800' },
  footnote: { fontSize: 13, textAlign: 'center', marginTop: spacing[1] },
});
