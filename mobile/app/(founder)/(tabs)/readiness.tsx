import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SegmentBar, useToast } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { AskCompliance } from '../../../src/components/readiness/AskCompliance';
import { ChecklistItemCard } from '../../../src/components/readiness/ChecklistItemCard';
import { SegmentedControl } from '../../../src/components/readiness/SegmentedControl';
import { complianceService } from '../../../src/services';
import { colors, radius, shadows, spacing } from '../../../src/theme/tokens';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';

type Tab = 'checklist' | 'ask';

const TABS: { value: Tab; label: string }[] = [
  { value: 'checklist', label: 'Checklist' },
  { value: 'ask', label: 'Ask Compliance' },
];

// Encouraging, and honest about what is left: a count, never a score.
function progressNote(done: number, total: number) {
  const left = total - done;
  if (left === 0) return 'Everything on your list is done. Investors can see you are ready.';
  if (done === 0) return `${left} to do. Start with one: each you finish opens the door to more investors.`;
  return `${left} left, and each one opens the door to more investors.`;
}

function ReadinessScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('checklist');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['compliance'], queryFn: () => complianceService.listItems() });
  const pull = usePullToRefresh(q.refetch);

  const items = q.data ?? [];
  const done = items.filter((i) => i.status === 'complete').length;
  // Still to do first, done at the bottom; the backend's order is kept within each group.
  const sorted = [...items.filter((i) => i.status !== 'complete'), ...items.filter((i) => i.status === 'complete')];

  const markDone = async (id: string, label: string) => {
    setSavingId(id);
    try {
      await complianceService.updateItemStatus(id, 'complete');
      await q.refetch();
      // Closing an item can move an investor from "fix this first" to "pitch".
      void qc.invalidateQueries({ queryKey: ['funding-matches'] });
      setOpenId(null);
      toast.show(`Nice work. ${label} is done.`, 'success');
    } catch (e) {
      toast.show((e as { message?: string })?.message ?? 'Could not save that. Try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // The co-pilot knows the experts on FoundersLink; it opens with the question ready to send.
  const askExpert = (label: string) =>
    router.push({ pathname: '/copilot', params: { ask: `Which expert could help me with "${label}"?` } } as never);

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <PageTitle
          title="Getting ready for investors"
          subtitle={items.length > 0 ? `${done} of ${items.length} things investors look for.` : 'What to finish before investors look closely, and answers on the rules.'}
        />
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>
      {/* Kept mounted, so her earlier questions are still there when she comes back. */}
      <View style={tab === 'ask' ? styles.flex : styles.hidden}>
        <AskCompliance />
      </View>
      {tab === 'ask' ? null : q.isLoading ? (
        <ScreenLoading />
      ) : q.isError ? (
        <ScreenError message="We could not load your checklist. Check your connection and try again." onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          refreshControl={<RefreshControl {...pull} />}
          data={sorted}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            items.length > 0 ? (
              <View
                style={styles.count}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: items.length, now: done }}
                accessibilityLabel={`${done} of ${items.length} done`}
              >
                <Text style={styles.countLine} accessibilityRole="header">
                  <Text style={styles.countNum}>{done}</Text>
                  <Text style={styles.countOf}>{` / ${items.length}`}</Text>
                </Text>
                <SegmentBar done={done} total={items.length} />
                <Text style={styles.note}>{progressNote(done, items.length)}</Text>
              </View>
            ) : null
          }
          ListHeaderComponentStyle={styles.hero}
          ListEmptyComponent={
            <ScreenEmpty
              title="No checklist yet"
              description="Your checklist is built from your business profile. In the meantime you can ask a compliance question."
              actionLabel="Ask Compliance"
              onAction={() => setTab('ask')}
            />
          }
          renderItem={({ item, index }) => (
            <ChecklistItemCard
              item={item}
              number={index + 1}
              last={index === sorted.length - 1}
              open={openId === item.id}
              onToggle={() => setOpenId((o) => (o === item.id ? null : item.id))}
              saving={savingId === item.id}
              onMarkDone={() => void markDone(item.id, item.label)}
              onAskExpert={() => askExpert(item.label)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  hidden: { display: 'none' },
  top: { paddingHorizontal: spacing[2], paddingBottom: spacing[1.5] },
  list: { paddingHorizontal: spacing[2], paddingBottom: spacing[3] },
  hero: { marginBottom: spacing[2] },
  count: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing[2],
    gap: spacing[1.5],
    ...shadows.sm,
  },
  countLine: { color: colors.primaryDark },
  countNum: { fontSize: 34, fontWeight: '300', color: colors.primaryDark },
  countOf: { fontSize: 17, color: colors.textMuted },
  note: { fontSize: 13, color: colors.textMuted },
});

export default withBackdrop(ReadinessScreen);
