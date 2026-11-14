import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Avatar, Button, Card, Fit } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading, ScreenOffline } from '../../../src/components/layout/ScreenStates';
import { bandBars, bandMeta, ReasonRow, splitHeadline, topReasons } from '../../../src/components/matches/parts';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { consentService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { verificationInvite } from '../../../src/lib/verification-invite';
import type { InvestorMatchCard } from '../../../src/types';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';

type Segment = 'pitch' | 'pitchAfter' | 'dontPitch';

const SEGMENTS: { key: Segment; label: string; title: string; hint: string; empty: string }[] = [
  {
    key: 'pitch',
    label: 'Ready to pitch',
    title: 'Ready to pitch',
    hint: 'These investors fit your business today.',
    empty: 'No investor fits fully yet. Look at "After one fix": closing one gap can move an investor here.',
  },
  {
    key: 'pitchAfter',
    label: 'After one fix',
    title: 'Pitch after you fix this',
    hint: 'These fit, once you close the gap named on each card.',
    empty: 'Nothing to fix. Every investor that fits you is already under "Ready to pitch".',
  },
  {
    key: 'dontPitch',
    label: 'Not a fit',
    title: 'Not a fit',
    hint: 'These fund a different kind of business. Save your time.',
    empty: 'Nobody is ruled out. Every investor we know of could fit you.',
  },
];

function MatchesScreen() {
  const router = useRouter();
  const wide = useWideLayout();
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useNetworkStatus();
  const [segment, setSegment] = useState<Segment>('pitch');
  // One card is open at a time, as in the design: tap a card to see its reasons.
  const [openId, setOpenId] = useState<string | null>(null);

  const consentQ = useQuery({ queryKey: ['consents'], queryFn: () => consentService.list() });
  const matchesQ = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches() });
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
      <PageTitle title="Investors for you" subtitle="Sorted by how well they fit your business." />

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
                  onPress={() => {
                    setSegment(s.key);
                    setOpenId(null);
                  }}
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

  return (
    <FlatList
      refreshControl={<RefreshControl {...pull} />}
      style={styles.flex}
      contentContainerStyle={page}
      data={list}
      keyExtractor={(item) => item.investorUserId}
      extraData={openId}
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
        <MatchCard
          item={item}
          missesFirst={segment === 'dontPitch'}
          open={openId === item.investorUserId}
          onToggle={() => setOpenId((id) => (id === item.investorUserId ? null : item.investorUserId))}
          onPress={() => router.push(`/founder/investor-match/${item.investorUserId}`)}
          onFix={() => router.push('/(founder)/(tabs)/readiness')}
        />
      )}
    />
  );
}

function MatchCard({
  item,
  missesFirst,
  open,
  onToggle,
  onPress,
  onFix,
}: {
  item: InvestorMatchCard;
  missesFirst: boolean;
  open: boolean;
  onToggle: () => void;
  onPress: () => void;
  onFix: () => void;
}) {
  const band = bandMeta[item.band];
  const afterFix = item.gaps.length > 0 && item.band !== 'not_a_fit';
  // A record with no name yet is known by its headline. Show its parts, not the sentence.
  const headline = item.anonymised || item.displayName.includes(' · ') ? splitHeadline(item.displayName) : null;
  const name = headline ? headline.kind : item.displayName;

  // Under the name: the firm, then what the headline says they fund and the ticket.
  const org = item.organisationName && !name.startsWith(item.organisationName) ? item.organisationName : null;
  const sub = [org, headline?.sectors.join(', '), headline?.ticket].filter(Boolean).join(' · ');
  const reasons = topReasons(item.reasons, 3, missesFirst);
  const line = reasons[0]?.text ?? '';
  const fitLabel = afterFix ? `${band.label} after one fix` : band.label;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${name}, ${fitLabel}. ${open ? 'Hide' : 'Show'} the reasons`}
        style={({ pressed }) => [styles.person, pressed && styles.dim]}
      >
        <Avatar name={name} size={52} />
        <View style={styles.flexOne}>
          <Text style={styles.name}>{name}</Text>
          {sub ? <Text style={styles.org}>{sub}</Text> : null}
          {item.anonymised ? <Text style={styles.org}>Their name shows once you are verified.</Text> : null}
          {line ? <Text style={styles.line}>{line}</Text> : null}
          <Fit label={fitLabel} filled={bandBars[item.band]} fix={afterFix} />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.more}>
          {afterFix ? (
            <>
              <Text style={styles.label}>Fix this first</Text>
              <View style={styles.reasons}>
                {item.gaps.map((g, i) => (
                  <ReasonRow key={g.text} n={i + 1} fits text={g.text} compact />
                ))}
              </View>
              <Button
                title={item.gaps.some((g) => g.kind === 'requirement') ? 'Sort it out in Readiness' : 'Answer it in Readiness'}
                variant="soft"
                onPress={onFix}
                accessibilityLabel={`Fix this first: ${item.gaps.map((g) => g.text).join(', ')}. Open Readiness`}
              />
            </>
          ) : null}

          {reasons.length > 0 ? (
            <>
              <Text style={[styles.label, afterFix && styles.labelGap]}>{missesFirst ? 'Why not' : 'Why they fit'}</Text>
              <View style={styles.reasons}>
                {reasons.map((r, i) => (
                  <ReasonRow key={r.signal} n={i + 1} fits={r.fits} text={r.text} compact />
                ))}
              </View>
            </>
          ) : null}

          {item.riskFactors.map((rf) => (
            <Text key={rf.text} style={styles.quiet}>
              {rf.text}
            </Text>
          ))}

          <Button
            title="See the full fit"
            variant={missesFirst || afterFix ? 'secondary' : 'primary'}
            onPress={onPress}
            accessibilityLabel={`See the full fit for ${name}`}
            style={styles.mainButton}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  flexOne: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6] },
  pageWide: { paddingBottom: spacing[6], maxWidth: 760, width: '100%' },
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

  card: { marginBottom: spacing[1.5] },
  person: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5], minHeight: touchTargetMin },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  org: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  line: { fontSize: 13, color: colors.text, marginTop: 4, marginBottom: 6 },

  more: { marginTop: 14 },
  label: { fontSize: 12, color: colors.textMuted },
  labelGap: { marginTop: spacing[2] },
  reasons: {
    marginTop: spacing[1],
    marginBottom: spacing[1.5],
    paddingTop: spacing[1],
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quiet: { fontSize: 13, color: colors.textMuted, marginBottom: spacing[1] },
  mainButton: { marginTop: spacing[0.5] },
});

export default withBackdrop(MatchesScreen);
