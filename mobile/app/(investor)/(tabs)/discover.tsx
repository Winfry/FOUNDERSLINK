import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useRouter } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ui/Text';
import { Avatar, Button, Card, Fit } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { Tag } from '../../../src/components/overview/parts';
import { kes, words } from '../../../src/components/matches/parts';
import { investorService, referenceDataService } from '../../../src/services';
import type { DiscoverCard } from '../../../src/services';
import type { MatchBand } from '../../../src/types';
import { useAuthStore } from '../../../src/stores/authStore';
import { verificationInvite } from '../../../src/lib/verification-invite';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';

const TITLE = 'Businesses for you';
const LINE = 'Founders who fit what you fund, already checked.';

const FIT: Record<MatchBand, { label: string; filled: number }> = {
  strong: { label: 'Strong fit', filled: 3 },
  good: { label: 'Good fit', filled: 2 },
  possible: { label: 'Possible fit', filled: 1 },
  not_a_fit: { label: 'Not a fit', filled: 0 },
};

function DiscoverScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.user?.approvalStatus);
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [focused, setFocused] = useState(false);

  // Wait until she stops typing before asking the server again.
  useEffect(() => {
    const t = setTimeout(() => setSearch(typed.trim()), 350);
    return () => clearTimeout(t);
  }, [typed]);

  const metaQ = useQuery({ queryKey: ['meta-options'], queryFn: () => referenceDataService.getMetaOptions() });
  const q = useQuery({
    queryKey: ['discover', search, sector],
    queryFn: () => investorService.discover({ search, sector }),
    placeholderData: keepPreviousData,
  });
  const pull = usePullToRefresh(q.refetch);

  const labels = (metaQ.data?.labels as Record<string, string> | undefined) ?? {};
  const label = (id: string | null) => (id ? (labels[id] ?? words(id)) : '');
  const sectors = Array.isArray(metaQ.data?.sectors) ? (metaQ.data.sectors as string[]) : [];

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError || !q.data) {
    const err = q.error as { message?: string; code?: string } | null;
    return (
      <ScreenError
        message={err?.message ?? 'The founders did not load. Check your connection and try again.'}
        code={err?.code}
        onRetry={() => q.refetch()}
      />
    );
  }

  const data = q.data;

  if (data.needsFund) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.list}>
        <PageTitle title={TITLE} subtitle={LINE} />
        <ScreenEmpty
          title="First, say what you fund"
          description="Tell us the sectors, stages and amounts you invest in. We use that to find the founders who fit you."
          actionLabel="Describe what I fund"
          onAction={() => router.push('/investor/onboarding')}
        />
      </ScrollView>
    );
  }

  // The backend says whether names are open; her status says which words fit.
  const invite = data.approved ? null : verificationInvite(status === 'approved' ? 'draft' : status, 'investor');
  const filtering = Boolean(search || sector);
  const clear = () => {
    setTyped('');
    setSearch('');
    setSector('');
  };

  const header = (
    <View style={styles.header}>
      <PageTitle title={TITLE} subtitle={LINE} />

      {invite ? (
        <Card style={styles.invite}>
          <Text style={styles.inviteTitle}>{invite.title}</Text>
          <Text style={styles.inviteText}>{invite.text}</Text>
          <Button title={invite.button} onPress={() => router.push(invite.route)} style={styles.inviteBtn} />
        </Card>
      ) : null}

      <View style={[styles.searchBox, focused && styles.searchBoxOn]}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by business or sector"
          placeholderTextColor={colors.textDim}
          accessibilityLabel="Search founders"
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {sectors.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {['', ...sectors].map((id) => {
            const on = sector === id;
            return (
              <Pressable
                key={id || 'all'}
                onPress={() => setSector(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.filter, on && styles.filterOn]}
              >
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{id ? label(id) : 'All sectors'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {data.message ? <Text style={styles.note}>{data.message}</Text> : null}
    </View>
  );

  return (
    <FlatList
      refreshControl={<RefreshControl {...pull} />}
      style={styles.flex}
      contentContainerStyle={styles.list}
      data={data.founders}
      keyExtractor={(item, i) => item.id ?? `anon-${i}`}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={
        filtering ? (
          <ScreenEmpty
            title="No businesses match these filters"
            description="Try a different word or sector, or clear the filters to see everyone who fits your fund."
            actionLabel="Clear filters"
            onAction={clear}
          />
        ) : (
          <ScreenEmpty
            title="No businesses fit your fund yet"
            description="New founders join every week. Widening what you fund can also bring more of them here."
            actionLabel="Review what I fund"
            onAction={() => router.push('/investor/onboarding')}
          />
        )
      }
      renderItem={({ item }) => (
        <FounderCard
          item={item}
          label={label}
          onPress={item.id && !item.anonymised ? () => router.push(`/investor/founder/${item.id}`) : undefined}
        />
      )}
    />
  );
}

function FounderCard({
  item,
  label,
  onPress,
}: {
  item: DiscoverCard;
  label: (id: string | null) => string;
  onPress?: () => void;
}) {
  const fit = FIT[item.band];
  const sector = label(item.sector);
  const title = item.anonymised || !item.businessName ? `${sector} business` : item.businessName;
  const who = !item.anonymised && item.founderName ? item.founderName : null;
  const facts = [sector, item.stage ? label(item.stage) : '', item.county].filter(Boolean).join(' · ');

  const body = (
    <>
      <View style={styles.person}>
        <Avatar name={who ?? title} size={52} />
        <View style={styles.flexOne}>
          <Text style={styles.name}>{title}</Text>
          {who ? <Text style={styles.org}>{who}</Text> : null}
          {facts ? <Text style={styles.org}>{facts}</Text> : null}
          {item.matchReasons.slice(0, 2).map((r) => (
            <Text key={r} style={styles.reason}>
              {r}
            </Text>
          ))}
          <View style={styles.tags}>
            <Fit label={fit.label} filled={fit.filled} />
            {item.ready ? <Tag label="Ready to raise" tone="done" /> : null}
          </View>
        </View>
      </View>

      {item.fundingAskKes ? (
        <View style={styles.ask}>
          <Text style={styles.askLabel}>Looking for</Text>
          <Text style={styles.askValue}>{kes(item.fundingAskKes)}</Text>
        </View>
      ) : null}

      {item.anonymised ? <Text style={styles.quiet}>Their name shows once you are verified.</Text> : null}

      {onPress ? (
        // The whole card opens the page; this only shows where to tap.
        <View style={styles.more} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text style={styles.moreText}>See the business</Text>
        </View>
      ) : null}
    </>
  );

  if (!onPress) return <Card style={styles.card}>{body}</Card>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${fit.label}. Open their page`}
      style={({ pressed }) => pressed && styles.dim}
    >
      <Card style={styles.card}>{body}</Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  flexOne: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: spacing[2], paddingBottom: spacing[6] },
  header: { paddingBottom: spacing[2] },

  invite: { gap: 6, marginBottom: spacing[1.5], borderColor: 'rgba(227,182,93,0.55)' },
  inviteTitle: { fontSize: 17, fontWeight: '500', color: colors.primaryDark },
  inviteText: { fontSize: 13, color: colors.textMuted },
  inviteBtn: { marginTop: spacing[1] },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargetMin,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchBoxOn: { borderColor: colors.primary },
  searchInput: {
    flex: 1,
    minHeight: touchTargetMin,
    fontSize: 15,
    color: colors.text,
    // The box shows focus; the browser's own outline would be a second, black one.
    outlineWidth: 0,
  },

  filterScroll: { marginTop: spacing[1.5], marginHorizontal: -spacing[2] },
  filterRow: { paddingHorizontal: spacing[2], gap: spacing[1] },
  filter: {
    minHeight: 40,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: { borderColor: colors.primaryLight, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 14, color: colors.textMuted },
  filterTextOn: { color: colors.primary, fontWeight: '500' },
  note: { fontSize: 13, color: colors.textMuted, marginTop: spacing[1.5] },

  card: { marginBottom: spacing[1.5], gap: spacing[1.5] },
  dim: { opacity: 0.85 },
  person: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  name: { fontSize: 16, fontWeight: '500', color: colors.text },
  org: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  reason: { fontSize: 13, color: colors.text, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[1] },
  ask: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing[1] },
  askLabel: { fontSize: 12, color: colors.textMuted },
  askValue: { fontSize: 20, color: colors.primaryDark },
  quiet: { fontSize: 13, color: colors.textMuted },
  more: {
    minHeight: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontSize: 15, fontWeight: '500', color: colors.primary },
});

export default withBackdrop(DiscoverScreen);
