import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, Input } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { complianceService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

export default function ReadinessScreen() {
  const [tab, setTab] = useState<'checklist' | 'ask'>('checklist');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['compliance'], queryFn: () => complianceService.listItems() });

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) return <ScreenError message="Could not load compliance items." onRetry={() => q.refetch()} />;

  const items = q.data ?? [];
  const done = items.filter((i) => i.status === 'complete').length;

  const ask = async () => {
    let res;
    try {
      res = await complianceService.ask(question);
    } catch (e) {
      // For example, a question too short to answer.
      setAnswer((e as { message?: string })?.message ?? 'Could not get an answer. Try again.');
      return;
    }
    if (res.cannotConfirm) {
      setAnswer("We can't confirm this. Contact a verified expert.");
      return;
    }
    const cites = res.citations.map((c) => `${c.title}: ${c.url}`).join('\n');
    setAnswer(`${res.body}\n\nSources:\n${cites}`);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'checklist' && styles.tabOn]} onPress={() => setTab('checklist')}>
          <Text style={tab === 'checklist' ? styles.tabTextOn : styles.tabText}>Checklist</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'ask' && styles.tabOn]} onPress={() => setTab('ask')}>
          <Text style={tab === 'ask' ? styles.tabTextOn : styles.tabText}>Ask Compliance</Text>
        </Pressable>
      </View>
      {tab === 'checklist' ? (
        <>
          <Text style={styles.progress}>{done} of {items.length} done</Text>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<ScreenEmpty title="No compliance items" />}
            renderItem={({ item }) => (
              <Card style={styles.row}>
                <Text style={styles.label}>{item.label}</Text>
                <Badge label={item.status.replace('_', ' ')} variant={item.status === 'complete' ? 'success' : 'warning'} />
                {item.deadline ? <Text style={styles.deadline}>Deadline: {item.deadline}</Text> : null}
                {item.status !== 'complete' ? (
                  <Button title="Mark complete" variant="secondary" onPress={() =>
                      complianceService.updateItemStatus(item.id, 'complete').then(() => {
                        void q.refetch();
                        // Closing an item can move an investor from "fix this first" to "pitch".
                        void qc.invalidateQueries({ queryKey: ['funding-matches'] });
                      })
                    } />
                ) : null}
              </Card>
            )}
          />
        </>
      ) : (
        <View style={styles.askWrap}>
          <Text style={styles.disclaimer}>Not legal advice. Answers cite official sources when available.</Text>
          <Input label="Your question" value={question} onChangeText={setQuestion} />
          <Button title="Ask" onPress={() => void ask()} />
          {answer ? <Text style={styles.answer}>{answer}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextOn: { color: colors.primary, fontWeight: '700' },
  progress: { padding: spacing[2], fontWeight: '700', color: colors.text },
  list: { padding: spacing[2] },
  row: { marginBottom: spacing[2], gap: 8 },
  label: { fontWeight: '600', color: colors.text },
  deadline: { fontSize: 12, color: colors.textMuted },
  askWrap: { padding: spacing[2], gap: spacing[2] },
  disclaimer: { fontSize: 12, color: colors.textMuted },
  answer: { color: colors.text, lineHeight: 20 },
});
