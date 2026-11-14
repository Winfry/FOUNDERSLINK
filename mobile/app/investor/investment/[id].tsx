import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { useToast } from '../../../src/components/ui/Toast';
import { kes, Tag } from '../../../src/components/overview/parts';
import { dealService } from '../../../src/services';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { checkInsOf, HEALTH, healthOf, isLate, longDate, termsLine } from '../../../src/lib/investments';
import { colors, radius, spacing } from '../../../src/theme/tokens';

const CHECK = { passed: { word: 'Date passed', tone: 'quiet' as const }, next: { word: 'Next', tone: 'todo' as const }, planned: { word: 'Planned', tone: 'quiet' as const } };

/**
 * One investment, after the money has moved: how the business is doing,
 * the latest in the deal room, the goals both sides agreed, the check-ins
 * 30, 90 and 180 days after closing, and whether it shows on her track
 * record. Each part is read from the deal itself.
 */
export default function InvestmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const q = useQuery({ queryKey: ['deal', id], queryFn: () => dealService.get(id) });
  const pull = usePullToRefresh(() => q.refetch());

  const sharing = useMutation({
    mutationFn: (share: boolean) => dealService.setSharing(id, share),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['deal', id] });
      void qc.invalidateQueries({ queryKey: ['deals'] });
      show(res.youShare ? (res.shown ? 'It now shows on your track record.' : 'Saved. It shows once the founder agrees too.') : 'Hidden from your track record.', 'success');
    },
    onError: (e) => show((e as { message?: string })?.message ?? 'That did not save. Try again.', 'error'),
  });

  const deal = q.data;
  if (!deal) {
    return (
      <View style={styles.page}>
        <Text style={styles.muted}>{q.isError ? "We couldn't load this investment." : 'Loading…'}</Text>
        {q.isError ? <Button title="Try again" variant="secondary" onPress={() => void q.refetch()} style={styles.start} /> : null}
      </View>
    );
  }

  const first = deal.withName.split(' ')[0];
  const { health, line } = healthOf(deal);
  const goals = deal.milestones ?? [];
  const checkIns = checkInsOf(deal);
  const latest = [...deal.timeline].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const shares = deal.sharesTrackRecord ?? false;

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Text style={styles.heading} accessibilityRole="header">
        {deal.title}
      </Text>
      <Text style={styles.muted}>With {deal.withName}</Text>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Avatar name={deal.withName} size={52} />
          <View style={styles.flex}>
            <Text style={styles.money}>{kes(deal.terms.amountKes)}</Text>
            <Text style={styles.muted}>{termsLine(deal)}</Text>
            <View style={styles.tag}>
              <Tag label={HEALTH[health].label} tone={HEALTH[health].tone} />
            </View>
          </View>
        </View>
        <Text style={styles.label}>How it's going</Text>
        <Text style={styles.body}>{line}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Latest in the deal room</Text>
        {latest.length === 0 ? (
          <Text style={styles.muted}>Nothing new yet.</Text>
        ) : (
          latest.map((e) => (
            <View key={e.id} style={styles.update}>
              <Text style={styles.when}>{longDate(e.at)}</Text>
              <Text style={styles.body}>{e.title}</Text>
            </View>
          ))
        )}
        <View style={styles.buttons}>
          <Button title="Ask for an update" onPress={() => router.push('/conversations')} />
          <Button title={`Message ${first}`} variant="secondary" onPress={() => router.push('/conversations')} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Goals you agreed</Text>
        {goals.length === 0 ? (
          <Text style={styles.muted}>No goals recorded yet. Agree them with {first} in the deal room.</Text>
        ) : (
          goals.map((m, i) => (
            <View key={m.id} style={[styles.goal, i > 0 && styles.goalLine]}>
              <View style={styles.flex}>
                <Text style={styles.goalTitle}>{m.title}</Text>
                {m.dueDate ? <Text style={styles.muted}>Due: {longDate(m.dueDate)}{isLate(m) ? ', now late' : ''}</Text> : null}
              </View>
              <Tag label={m.status === 'done' ? 'Done' : 'Not yet'} tone={m.status === 'done' ? 'done' : isLate(m) ? 'late' : 'quiet'} />
            </View>
          ))
        )}
      </Card>

      {checkIns.length ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Check-ins</Text>
          {checkIns.map((c, i) => (
            <View key={c.days} style={styles.step}>
              <View style={styles.stoneCol}>
                <View style={[styles.stone, c.state === 'next' && styles.stoneNext, c.state === 'passed' && styles.stonePassed]}>
                  <Text style={[styles.stoneText, c.state === 'next' && styles.stoneTextNext]}>{c.days}</Text>
                </View>
                {i < checkIns.length - 1 ? <View style={styles.stem} /> : null}
              </View>
              <View style={styles.stepCard}>
                <Text style={styles.goalTitle}>{c.days} days after closing</Text>
                <Text style={styles.muted}>
                  {CHECK[c.state].word} · {longDate(c.date)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.track}>
        <Text style={styles.label}>On your profile</Text>
        <Text style={styles.body}>
          {shares ? 'Shown on your track record as a verified deal, once the founder agrees too.' : 'Hidden from your track record. Only you and the founder see it.'}
        </Text>
        <Button
          title={shares ? 'Hide it from my profile' : 'Show it on my profile'}
          variant="secondary"
          loading={sharing.isPending}
          onPress={() => sharing.mutate(!shares)}
          style={styles.topGap}
        />
      </View>

      <Button title="Open the deal room" variant="soft" onPress={() => router.push(`/deal/${deal.id}` as never)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  heading: { fontSize: 28, color: colors.primaryDark, marginTop: spacing[1] },
  card: { gap: spacing[1] },
  row: { flexDirection: 'row', gap: spacing[1.5], alignItems: 'flex-start' },
  money: { fontSize: 24, color: colors.primaryDark },
  tag: { marginTop: 6 },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  update: { borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 12, paddingVertical: 2 },
  when: { fontSize: 12, color: colors.textMuted },
  buttons: { gap: 8, marginTop: spacing[1] },
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: 10 },
  goalLine: { borderTopWidth: 1, borderTopColor: colors.border },
  goalTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  step: { flexDirection: 'row', gap: spacing[1.5] },
  stoneCol: { alignItems: 'center' },
  stone: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stoneNext: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  stonePassed: { backgroundColor: colors.grey100 },
  stoneText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  stoneTextNext: { color: colors.primary },
  stem: { width: 1, flex: 1, minHeight: 10, backgroundColor: colors.borderStrong },
  stepCard: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10, backgroundColor: colors.white },
  track: { backgroundColor: colors.primaryLight, borderRadius: radius.card, padding: spacing[2], gap: 4 },
  topGap: { marginTop: spacing[1] },
  start: { alignSelf: 'flex-start', marginTop: spacing[1] },
});
