import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Avatar, Button, Card, FitBars } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading, ScreenOffline } from '../../../src/components/layout/ScreenStates';
import { bandBars, bandMeta, splitHeadline, topReasons } from '../../../src/components/matches/parts';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { connectionService, consentService, dealService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { verificationInvite } from '../../../src/lib/verification-invite';
import type { ConnectionJoinRequest, Deal, InvestorMatchCard } from '../../../src/types';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';

type Segment = 'pitch' | 'pitchAfter' | 'dontPitch';

const SEGMENTS: { key: Segment; label: string; title: string; hint: string; empty: string }[] = [
  {
    key: 'pitch',
    label: 'Ready',
    title: 'Ready to pitch',
    hint: 'These investors fit your business today.',
    empty: 'No investor fits fully yet. Look at "After a fix": closing one gap can move an investor here.',
  },
  {
    key: 'pitchAfter',
    label: 'After a fix',
    title: 'Pitch after you fix this',
    hint: 'These fit, once you close the gap named on each card.',
    empty: 'Nothing to fix. Every investor that fits you is already under "Ready".',
  },
  {
    key: 'dontPitch',
    label: 'Not a fit',
    title: 'Not a fit',
    hint: 'These fund a different kind of business. Save your time.',
    empty: 'Nobody is ruled out. Every investor we know of could fit you.',
  },
];

/**
 * Where she stands with an investor, in a few words: in a deal room with
 * them, waiting on a request, connected, or not contacted yet.
 */
function standing(personId: string | undefined, deals: Deal[], requests: ConnectionJoinRequest[]): string {
  if (!personId) return 'Not on FoundersLink yet';
  if (deals.some((d) => d.withUserId === personId && d.stage !== 'closed')) return 'In deal room';
  const r = requests.find((c) => c.withUserId === personId);
  if (r?.status === 'accepted') return 'Connected';
  if (r?.status === 'pending') return r.direction === 'sent' ? 'Request sent' : 'Wants to connect';
  if (r?.status === 'declined') return 'Declined';
  return 'Not contacted';
}

function MatchesScreen() {
  const router = useRouter();
  const wide = useWideLayout();
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useNetworkStatus();
  const [segment, setSegment] = useState<Segment>('pitch');

  const consentQ = useQuery({ queryKey: ['consents'], queryFn: () => consentService.list() });
  const matchesQ = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches() });
  // For "In deal room", "Request sent", "Not contacted" under each investor.
  const dealsQ = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list() });
  const peopleQ = useQuery({ queryKey: ['connections'], queryFn: () => connectionService.list() });
  const pull = usePullToRefresh(matchesQ.refetch);

  const aiMatchingOn = consentQ.data?.find((c) => c.purpose === 'ai_matching')?.granted ?? false;

  const lists = useMemo(() => {
    const m = matchesQ.data;
    return { pitch: m?.applyNow ?? [], pitchAfter: m?.applyAfter ?? [], dontPitch: m?.notForYou ?? [] };
  }, [matchesQ.data]);

  if (isOffline && !matchesQ.data) return <ScreenOffline onRetry={() => matchesQ.refetch()} />;
  if (matchesQ.isLoading || consentQ.isLoading) return <ScreenLoading />;
  if (matchesQ.isError) {
    const err = matchesQ.error as { message?: string; code?: string } | null;
    return (
      <ScreenError
        message={err?.message ?? 'Your investor matches did not load. Check your connection and try again.'}
        code={err?.code}
        onRetry={() => matchesQ.refetch()}
      />
    );
  }
  // Without her consents we cannot tell whether matching is on, so we say
  // so, instead of wrongly telling her it is off.
  if (consentQ.isError) {
    return (
      <ScreenError
        message="Your matching settings did not load. Check your connection and try again."
        onRetry={() => consentQ.refetch()}
      />
    );
  }

  const status = user?.approvalStatus;
  const invite = verificationInvite(status, 'founder');
  const current = SEGMENTS.find((s) => s.key === segment) ?? SEGMENTS[0];
  const list = lists[segment];
  const page = wide ? styles.pageWide : styles.page;

  const header = (
    <View>
      <PageTitle title="Investors who fit you." subtitle="Sorted by how well they fit your business." />

      {invite ? (
        <Card style={styles.invite}>
          <Text style={styles.inviteTitle}>{invite.title}</Text>
          <Text style={styles.inviteText}>{invite.text}</Text>
          <Button title={invite.button} onPress={() => router.push(invite.route)} style={styles.inviteButton} />
        </Card>
      ) : null}

      {aiMatchingOn ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
            accessibilityRole="tablist"
          >
            {SEGMENTS.map((s) => {
              const on = s.key === segment;
              return (
                <Pressable
                  key={s.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${s.title}, ${lists[s.key].length}`}
                  style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && styles.dim]}
                  onPress={() => setSegment(s.key)}
                >
                  <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                    {`${s.label} · ${lists[s.key].length}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.hint}>{current.hint}</Text>
        </>
      ) : null}
    </View>
  );

  if (!aiMatchingOn) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={page}>
        {header}
        <ScreenEmpty
          title="Matching is off"
          description="You have not allowed FoundersLink to use your business details for matching, so there are no investors to show. You can turn it on in your consents; nothing else about your profile changes."
          actionLabel="Open my consents"
          // A route the typed-routes list learns of when the dev server next runs.
          onAction={() => router.push('/settings/consents' as never)}
        />
      </ScrollView>
    );
  }

  const deals = dealsQ.data ?? [];
  const requests = peopleQ.data ?? [];

  return (
    <FlatList
      // Two columns on a computer, one on a phone.
      key={wide ? 'two' : 'one'}
      numColumns={wide ? 2 : 1}
      columnWrapperStyle={wide ? styles.columns : undefined}
      refreshControl={<RefreshControl {...pull} />}
      style={styles.flex}
      contentContainerStyle={page}
      data={list}
      keyExtractor={(item) => item.investorUserId}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <ScreenEmpty
          title="No investors in this list"
          description={current.empty}
          actionLabel="Check my readiness"
          onAction={() => router.push('/(founder)/(tabs)/readiness')}
        />
      }
      renderItem={({ item }) => (
        <View style={wide ? styles.half : undefined}>
          <MatchCard
            item={item}
            segment={segment}
            status={standing(item.personUserId, deals, requests)}
            onPress={() => router.push(`/founder/investor-match/${item.investorUserId}`)}
          />
        </View>
      )}
    />
  );
}

/**
 * One investor, as in the approved design: face, name, firm and ticket,
 * the fit bars, and under them where she stands with them and "View".
 * After a fix, the line names what to fix; not a fit, it says why not.
 */
function MatchCard({ item, segment, status, onPress }: { item: InvestorMatchCard; segment: Segment; status: string; onPress: () => void }) {
  const band = bandMeta[item.band];
  const afterFix = segment === 'pitchAfter';
  // A record with no name yet is known by its headline. Show its parts, not the sentence.
  const headline = item.anonymised || item.displayName.includes(' · ') ? splitHeadline(item.displayName) : null;
  const name = headline ? headline.kind : item.displayName;
  const org = item.organisationName && !name.startsWith(item.organisationName) ? item.organisationName : null;
  const sub = [org, headline?.sectors.join(', '), item.ticket ?? headline?.ticket].filter(Boolean).join(' · ');

  const why = topReasons(item.reasons, 1, true)[0];
  const line =
    segment === 'pitch'
      ? status
      : afterFix
        ? `Needs: ${item.gaps.map((g) => g.text).join(', ') || 'one fix'}`
        : (why && !why.fits ? why.text : band.label);
  const action = segment === 'pitch' ? 'View' : afterFix ? 'See fix' : null;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${afterFix ? `${band.label} after a fix` : band.label}. ${line}`}
        style={({ pressed }) => [pressed && styles.dim]}
      >
        <View style={styles.person}>
          <Avatar name={name} size={48} />
          <View style={styles.flexOne}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {sub ? <Text style={styles.org} numberOfLines={2}>{sub}</Text> : null}
          </View>
          <FitBars filled={bandBars[item.band]} fix={afterFix} />
        </View>
        <View style={styles.foot}>
          <Text style={[styles.status, segment === 'pitch' && status === 'In deal room' && styles.statusOn]} numberOfLines={2}>
            {line}
          </Text>
          {/* The whole card opens the page; this is how it says so. */}
          {action ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{action}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  flexOne: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6] },
  pageWide: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], width: '100%' },
  dim: { opacity: 0.85 },

  invite: { marginBottom: spacing[2], gap: 4 },
  inviteTitle: { fontSize: 16, fontWeight: '500', color: colors.primaryDark },
  inviteText: { fontSize: 13, color: colors.textMuted },
  inviteButton: { marginTop: spacing[1] },

  tabs: { gap: 6 },
  tab: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  tabOn: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextOn: { color: colors.white },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: spacing[1.5], marginBottom: spacing[1.5] },

  columns: { gap: spacing[1.5] },
  half: { flex: 1, maxWidth: '50%' },
  card: { marginBottom: spacing[1.5], paddingVertical: 14 },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], minHeight: touchTargetMin },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  org: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[1.5], marginTop: 10 },
  status: { flex: 1, fontSize: 13, color: colors.textMuted },
  statusOn: { color: colors.primary, fontWeight: '500' },
  pill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primaryBorder },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.primary },
});

export default withBackdrop(MatchesScreen);
