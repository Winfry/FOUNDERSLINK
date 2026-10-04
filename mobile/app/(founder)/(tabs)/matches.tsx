import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Info, Lock, ShieldCheck, Wrench } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading, ScreenOffline } from '../../../src/components/layout/ScreenStates';
import { bandMeta, Chip, ReasonRow, splitHeadline, topReasons } from '../../../src/components/matches/parts';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { consentService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import type { InvestorMatchCard } from '../../../src/types';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';

type Segment = 'pitch' | 'pitchAfter' | 'dontPitch';

const SEGMENTS: { key: Segment; label: string; title: string; hint: string; empty: string }[] = [
  {
    key: 'pitch',
    label: 'Pitch',
    title: 'Pitch',
    hint: 'These investors fit your business today.',
    empty: 'No investor fits fully yet. Look at "Fix first": closing one gap can move an investor here.',
  },
  {
    key: 'pitchAfter',
    label: 'Fix first',
    title: 'Pitch after you fix this',
    hint: 'These fit, once you close the gap shown on each card.',
    empty: 'Nothing to fix. Every investor that fits you is already under "Pitch".',
  },
  {
    key: 'dontPitch',
    label: "Don't pitch",
    title: "Don't pitch",
    hint: 'These fund a different kind of business. Save your time.',
    empty: 'Nobody is ruled out. Every investor we know of could fit you.',
  },
];

export default function MatchesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useNetworkStatus();
  const [segment, setSegment] = useState<Segment>('pitch');

  const consentQ = useQuery({ queryKey: ['consents'], queryFn: () => consentService.list() });
  const matchesQ = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches() });

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

  const status = user?.approvalStatus;
  const unverified = status !== 'approved';
  const waiting = status === 'submitted' || status === 'in_review';
  const current = SEGMENTS.find((s) => s.key === segment) ?? SEGMENTS[0];
  const list = lists[segment];

  const header = (
    <View style={styles.header}>
      <Text style={styles.heading}>Investors for you</Text>
      <Text style={styles.sub}>Sorted by how well they fit your business.</Text>

      {unverified ? (
        <View style={styles.invite}>
          <View style={styles.inviteTop}>
            <View style={styles.inviteIcon}>
              <ShieldCheck size={22} color={colors.primary} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.inviteTitle}>{waiting ? "We're checking your details" : 'Verify to connect'}</Text>
              <Text style={styles.inviteText}>
                {waiting
                  ? 'Names and the Connect button open as soon as FoundersLink approves you.'
                  : 'Verify once to see investor names and send them a request to connect.'}
              </Text>
            </View>
          </View>
          <Button
            title={waiting ? 'See my verification status' : 'Start verification'}
            onPress={() => router.push(waiting ? '/founder/verify/status' : '/founder/verify')}
          />
        </View>
      ) : null}

      {aiMatchingOn ? (
        <>
          <View style={styles.segments} accessibilityRole="tablist">
            {SEGMENTS.map((s) => {
              const on = s.key === segment;
              return (
                <Pressable
                  key={s.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${s.title}, ${lists[s.key].length}`}
                  style={[styles.segment, on && styles.segmentOn]}
                  onPress={() => setSegment(s.key)}
                >
                  <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
                    {s.label}
                  </Text>
                  <View style={[styles.count, on && styles.countOn]}>
                    <Text style={[styles.countText, on && styles.countTextOn]}>{lists[s.key].length}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{current.hint}</Text>
        </>
      ) : null}
    </View>
  );

  if (!aiMatchingOn) {
    return (
      <View style={styles.flex}>
        {header}
        <ScreenEmpty
          title="Matching is off"
          description="You have not allowed FoundersLink to use your business details for matching, so there are no investors to show. You can allow it in your business details."
          actionLabel="Open my business details"
          onAction={() => router.push('/founder/onboarding')}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.list}
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
        <MatchCard
          item={item}
          missesFirst={segment === 'dontPitch'}
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
  onPress,
  onFix,
}: {
  item: InvestorMatchCard;
  missesFirst: boolean;
  onPress: () => void;
  onFix: () => void;
}) {
  const band = bandMeta[item.band];
  // A record with no name yet is known by its headline. Show its parts, not the sentence.
  const headline = item.anonymised || item.displayName.includes(' · ') ? splitHeadline(item.displayName) : null;
  const name = headline ? headline.kind : item.displayName;

  return (
    <Card style={styles.card}>
      {/* The gap box is its own button, so it sits beside the card's main button, not inside it. */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${band.label}. Open details`}
        style={({ pressed }) => [styles.cardMain, pressed && styles.dim]}
      >
        <View style={styles.cardTop}>
          <View style={styles.flexOne}>
            <Text style={styles.name}>{name}</Text>
            {item.organisationName && !name.startsWith(item.organisationName) ? (
              <Text style={styles.org}>{item.organisationName}</Text>
            ) : null}
          </View>
          <Badge label={band.label} variant={band.badge} />
        </View>

        {item.anonymised ? (
          <View style={styles.quietRow}>
            <Lock size={16} color={colors.textMuted} />
            <Text style={styles.quietText}>Their name shows once you are verified.</Text>
          </View>
        ) : null}

        {headline && (headline.sectors.length > 0 || headline.ticket) ? (
          <View style={styles.chips}>
            {headline.sectors.map((s) => (
              <Chip key={s} label={s} />
            ))}
            {headline.ticket ? <Chip label={headline.ticket} /> : null}
          </View>
        ) : null}

        <View style={styles.reasons}>
          {topReasons(item.reasons, 2, missesFirst).map((r) => (
            <ReasonRow key={r.signal} fits={r.fits} text={r.text} compact />
          ))}
        </View>
      </Pressable>

      {item.gaps.length > 0 ? (
        <Pressable
          style={({ pressed }) => [styles.gapBox, pressed && styles.dim]}
          onPress={onFix}
          accessibilityRole="button"
          accessibilityLabel={`Fix this first: ${item.gaps.map((g) => g.text).join(', ')}. Open Readiness`}
        >
          <View style={styles.gapIcon}>
            <Wrench size={16} color={colors.primaryDark} />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.gapLabel}>Fix this first</Text>
            {item.gaps.map((g) => (
              <Text key={g.text} style={styles.gapText}>
                {g.text}
              </Text>
            ))}
            <Text style={styles.gapLink}>
              {item.gaps.some((g) => g.kind === 'requirement') ? 'Sort it out in Readiness' : 'Answer it in Readiness'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.primary} />
        </Pressable>
      ) : null}

      {item.riskFactors.map((rf) => (
        <View key={rf.text} style={styles.quietRow}>
          <Info size={16} color={colors.textMuted} />
          <Text style={styles.quietText}>{rf.text}</Text>
        </View>
      ))}

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`See the full fit for ${name}`}
        style={({ pressed }) => [styles.more, pressed && styles.dim]}
      >
        <Text style={styles.moreText}>See the full fit</Text>
        <ChevronRight size={18} color={colors.primary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  flexOne: { flex: 1 },
  list: { paddingBottom: spacing[6] },
  header: { paddingHorizontal: spacing[2], paddingTop: spacing[1], paddingBottom: spacing[2] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, fontWeight: '500', color: colors.textMuted, marginTop: spacing[0.5] },

  invite: {
    marginTop: spacing[2],
    padding: spacing[2],
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    gap: spacing[2],
  },
  inviteTop: { flexDirection: 'row', gap: spacing[1.5], alignItems: 'flex-start' },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: { fontSize: 17, fontWeight: '700', color: colors.primaryDark },
  inviteText: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: spacing[0.5] },

  segments: {
    flexDirection: 'row',
    marginTop: spacing[3],
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.grey100,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing[0.5],
    borderRadius: 10,
  },
  // A white pill on the chosen side, its label in orange: "you are here".
  segmentOn: {
    backgroundColor: colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted, flexShrink: 1 },
  segmentTextOn: { color: colors.accent, fontWeight: '800' },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.grey200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countOn: { backgroundColor: colors.accent },
  countText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  countTextOn: { color: colors.primaryDark },
  hint: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginTop: spacing[1.5] },

  card: { marginHorizontal: spacing[2], marginBottom: spacing[2], borderRadius: 16, gap: spacing[1.5] },
  cardMain: { gap: spacing[1.5] },
  dim: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  org: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  reasons: { gap: spacing[1] },

  gapBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    padding: spacing[1.5],
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    minHeight: touchTargetMin,
  },
  gapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapLabel: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  gapText: { fontSize: 16, fontWeight: '700', color: colors.text },
  gapLink: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 2 },

  quietRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  quietText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textMuted },

  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    minHeight: touchTargetMin,
    marginBottom: -spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moreText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
