import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useToast } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { AskCompliance } from '../../../src/components/readiness/AskCompliance';
import { ChecklistItemCard } from '../../../src/components/readiness/ChecklistItemCard';
import { ProgressHero } from '../../../src/components/readiness/ProgressHero';
import { SegmentedControl } from '../../../src/components/readiness/SegmentedControl';
import { complianceService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

type Tab = 'checklist' | 'ask';

const TABS: { value: Tab; label: string }[] = [
  { value: 'checklist', label: 'Checklist' },
  { value: 'ask', label: 'Ask Compliance' },
];

export default function ReadinessScreen() {
  const [tab, setTab] = useState<Tab>('checklist');
  const [savingId, setSavingId] = useState<string | null>(null);

  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['compliance'], queryFn: () => complianceService.listItems() });

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
      toast.show(`${label} marked as done`, 'success');
    } catch (e) {
      toast.show((e as { message?: string })?.message ?? 'Could not save that. Try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.switch}>
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
          data={sorted}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={items.length > 0 ? <ProgressHero done={done} total={items.length} /> : null}
          ListHeaderComponentStyle={styles.hero}
          ListEmptyComponent={
            <ScreenEmpty
              title="No checklist yet"
              description="Your checklist is built from your business profile. In the meantime you can ask a compliance question."
              actionLabel="Ask Compliance"
              onAction={() => setTab('ask')}
            />
          }
          renderItem={({ item }) => (
            <ChecklistItemCard
              item={item}
              saving={savingId === item.id}
              onMarkDone={() => void markDone(item.id, item.label)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  hidden: { display: 'none' },
  switch: { paddingHorizontal: spacing[2], paddingTop: spacing[0.5], paddingBottom: spacing[1.5] },
  list: { paddingHorizontal: spacing[2], paddingBottom: spacing[3], gap: spacing[1.5] },
  hero: { marginBottom: spacing[1.5] },
});
