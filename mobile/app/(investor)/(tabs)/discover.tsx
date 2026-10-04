import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useRouter } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, Lock, Search, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ui/Text';
import { Badge, Button, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { bandMeta, Chip, kes, ReasonRow, words } from '../../../src/components/matches/parts';
import { investorService, referenceDataService } from '../../../src/services';
import type { DiscoverCard } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';

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
      <View style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.heading}>Founders for you</Text>
        </View>
        <ScreenEmpty
          title="First, say what you fund"
          description="Tell us the sectors, stages and amounts you invest in. We use that to find the founders who fit you."
          actionLabel="Describe what I fund"
          onAction={() => router.push('/investor/onboarding')}
        />
      </View>
    );
  }

  const waiting = status === 'submitted' || status === 'in_review';
  const filtering = Boolean(search || sector);
  const clear = () => {
    setTyped('');
    setSearch('');
    setSector('');
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.heading}>Founders for you</Text>
      {data.message ? <Text style={styles.sub}>{data.message}</Text> : null}

      {!data.approved ? (
        <View style={styles.invite}>
          <View style={styles.inviteTop}>
            <View style={styles.inviteIcon}>
              <ShieldCheck size={22} color={colors.primary} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.inviteTitle}>{waiting ? "We're checking your details" : 'Verify to see who they are'}</Text>
              <Text style={styles.inviteText}>
                {waiting
                  ? 'Names and founder pages open as soon as FoundersLink approves you.'
                  : 'Verify once to see founder names, open their pages and ask to join.'}
              </Text>
            </View>
          </View>
          <Button
            title={waiting ? 'See my status' : 'Start verification'}
            onPress={() => router.push(waiting ? '/founder/verify/status' : '/founder/verify')}
          />
        </View>
      ) : null}

      <View style={[styles.searchBox, focused && styles.searchBoxOn]}>
        <Search size={20} color={colors.textMuted} />
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by business or sector"
          placeholderTextColor={colors.textMuted}
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
    </View>
  );

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.list}
      data={data.founders}
      keyExtractor={(item, i) => item.id ?? `anon-${i}`}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={
        filtering ? (
          <ScreenEmpty
            title="No founders match these filters"
            description="Try a different word or sector, or clear the filters to see everyone who fits your fund."
            actionLabel="Clear filters"
            onAction={clear}
          />
        ) : (
          <ScreenEmpty
            title="No founders fit your fund yet"
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
  const band = bandMeta[item.band];
  const sector = label(item.sector);
  const title = item.anonymised || !item.businessName ? `${sector} business` : item.businessName;

  const body = (
    <>
      <View style={styles.cardTop}>
        <View style={styles.flexOne}>
          <Text style={styles.name}>{title}</Text>
          {!item.anonymised && item.founderName ? <Text style={styles.person}>{item.founderName}</Text> : null}
        </View>
        <Badge label={band.label} variant={band.badge} />
      </View>

      <View style={styles.chips}>
        {sector ? <Chip label={sector} /> : null}
        {item.stage ? <Chip label={label(item.stage)} /> : null}
        {item.county ? <Chip label={item.county} /> : null}
      </View>

      {item.fundingAskKes ? (
        <View>
          <Text style={styles.askLabel}>Looking for</Text>
          <Text style={styles.ask}>{kes(item.fundingAskKes)}</Text>
        </View>
      ) : null}

      {item.ready ? (
        <View style={styles.badgeRow}>
          <Badge label="Ready to raise" variant="success" />
        </View>
      ) : null}

      {item.matchReasons.length > 0 ? (
        <View style={styles.reasons}>
          {item.matchReasons.slice(0, 3).map((r) => (
            <ReasonRow key={r} fits text={r} compact />
          ))}
        </View>
      ) : null}

      {item.anonymised ? (
        <View style={styles.quietRow}>
          <Lock size={16} color={colors.textMuted} />
          <Text style={styles.quietText}>Her name shows once you are verified</Text>
        </View>
      ) : null}

      {onPress ? (
        <View style={styles.more}>
          <Text style={styles.moreText}>See her business</Text>
          <ChevronRight size={18} color={colors.primary} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) return <Card style={styles.card}>{body}</Card>;

  return (
    <Card style={styles.cardShell}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${band.label}. Open her page`}
        style={({ pressed }) => [styles.cardPress, pressed && styles.dim]}
      >
        {body}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  flexOne: { flex: 1 },
  list: { paddingBottom: spacing[6] },
  header: { paddingHorizontal: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[2] },
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

  searchBox: {
    marginTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: touchTargetMin,
    paddingHorizontal: spacing[1.5],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchBoxOn: { borderColor: colors.primary },
  searchInput: {
    flex: 1,
    minHeight: touchTargetMin,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    // The box shows focus; the browser's own outline would be a second, black one.
    outlineWidth: 0,
  },

  filterScroll: { marginTop: spacing[1.5], marginHorizontal: -spacing[2] },
  filterRow: { paddingHorizontal: spacing[2], gap: spacing[1] },
  filter: {
    minHeight: touchTargetMin,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterText: { fontSize: 14, fontWeight: '600', color: colors.text },
  filterTextOn: { color: colors.primary, fontWeight: '700' },

  card: { marginHorizontal: spacing[2], marginBottom: spacing[2], borderRadius: 16, gap: spacing[1.5] },
  cardShell: { marginHorizontal: spacing[2], marginBottom: spacing[2], borderRadius: 16, padding: 0 },
  cardPress: { padding: spacing[2], gap: spacing[1.5] },
  dim: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  person: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  askLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  ask: { fontSize: 20, fontWeight: '800', color: colors.text },
  badgeRow: { flexDirection: 'row' },
  reasons: { gap: spacing[1] },
  quietRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  quietText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textMuted },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingTop: spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moreText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});

export default withBackdrop(DiscoverScreen);
