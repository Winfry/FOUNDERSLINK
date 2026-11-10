import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Check, CircleCheckBig, Circle, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { useToast } from '../../../src/components/ui/Toast';
import { Illustration } from '../../../src/components/illustrations/People';
import { Column, Columns, Empty, Panel, Tag } from '../../../src/components/overview/parts';
import { copilotService, type CopilotAnswer, type CopilotTask, type TaskAction } from '../../../src/services';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { colors, radius, spacing, touchTargetMin } from '../../../src/theme/tokens';

const PROMPTS = [
  'What should I focus on this week?',
  'Am I ready to pitch investors?',
  'Which experts could help me?',
  'Nisaidie kupanga wiki hii',
];

const due = (d: string | null) => {
  if (!d) return null;
  const days = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
  return days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
};

interface Turn {
  id: number;
  question: string;
  answer?: CopilotAnswer;
  error?: string;
}

/** A suggested task, with the founder's decision on it. */
function Suggestion({ task, onDecide, busy }: { task: CopilotTask; onDecide: (t: CopilotTask, a: TaskAction) => void; busy: boolean }) {
  const decided = task.status !== 'proposed';
  return (
    <View style={styles.suggestion}>
      <View style={styles.flex}>
        <Text style={styles.suggestionTitle}>{task.title}</Text>
        {task.detail ? <Text style={styles.muted}>{task.detail}</Text> : null}
        {due(task.dueDate) ? <Text style={styles.small}>{due(task.dueDate)}</Text> : null}
      </View>
      {decided ? (
        <Tag label={task.status === 'open' ? 'Added' : task.status === 'done' ? 'Done' : 'Not now'} tone={task.status === 'open' ? 'done' : 'todo'} />
      ) : (
        <View style={styles.decide}>
          <Button title="Approve" onPress={() => onDecide(task, 'approve')} disabled={busy} style={styles.smallButton} />
          <Button title="Not now" variant="secondary" onPress={() => onDecide(task, 'dismiss')} disabled={busy} style={styles.smallButton} />
        </View>
      )}
    </View>
  );
}

/**
 * The founder's AI business co-pilot. It reads her own FoundersLink data
 * (profile, readiness, matches, experts), plans what to do next, and
 * suggests tasks. A suggestion is added to her list only when she approves
 * it, and everything it did is listed below.
 */
export default function CopilotScreen() {
  const router = useRouter();
  const wide = useWideLayout();
  const qc = useQueryClient();
  const { show } = useToast();
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownTask, setOwnTask] = useState('');

  const tasksQ = useQuery({ queryKey: ['copilot-tasks'], queryFn: () => copilotService.tasks() });
  const activityQ = useQuery({ queryKey: ['copilot-activity'], queryFn: () => copilotService.activity() });
  const pull = usePullToRefresh(() => Promise.all([tasksQ.refetch(), activityQ.refetch()]));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['copilot-tasks'] });
    void qc.invalidateQueries({ queryKey: ['copilot-activity'] });
  };

  const ask = async (text: string) => {
    const question = text.trim();
    if (question.length < 2 || asking) return;
    setDraft('');
    const id = Date.now();
    setTurns((t) => [{ id, question }, ...t]);
    setAsking(true);
    try {
      const answer = await copilotService.ask(question);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'The co-pilot did not answer. Check your connection and try again.';
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: message } : x)));
    } finally {
      setAsking(false);
      refresh();
    }
  };

  const decide = async (task: CopilotTask, action: TaskAction) => {
    setBusy(true);
    try {
      const updated = await copilotService.decide(task.id, action);
      // The suggestion in the answer shows her decision.
      setTurns((t) => t.map((x) => (x.answer ? { ...x, answer: { ...x.answer, proposals: x.answer.proposals.map((p) => (p.id === updated.id ? updated : p)) } } : x)));
      show(action === 'approve' ? 'Added to your tasks' : action === 'done' ? `Nice work. "${task.title}" is done.` : action === 'dismiss' ? 'Left off your list' : 'Back on your list', 'success');
      refresh();
    } catch (e) {
      show((e as { message?: string })?.message ?? 'That did not save. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addOwn = async () => {
    const title = ownTask.trim();
    if (title.length < 3) return;
    setBusy(true);
    try {
      await copilotService.addTask(title);
      setOwnTask('');
      refresh();
    } catch (e) {
      show((e as { message?: string })?.message ?? 'That did not save. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const tasks = tasksQ.data ?? [];
  const waiting = tasks.filter((t) => t.status === 'proposed');
  const open = tasks.filter((t) => t.status === 'open');
  const finished = tasks.filter((t) => t.status === 'done').slice(0, 5);

  const askBox = (
    <View style={[styles.card, styles.askCard]}>
      <View style={styles.askHead}>
        {wide ? <Illustration name="mentor" width={150} /> : null}
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Sparkles size={20} color={colors.primary} />
            <Text style={styles.title} accessibilityRole="header">Your AI business co-pilot</Text>
          </View>
          <Text style={styles.muted}>
            It reads your FoundersLink profile, checklist and matches, then suggests what to do next. A task is added only when you approve it.
          </Text>
        </View>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask your co-pilot anything about your business"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Your question for the co-pilot"
          onSubmitEditing={() => void ask(draft)}
          returnKeyType="send"
          editable={!asking}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask the co-pilot"
          onPress={() => void ask(draft)}
          disabled={asking || draft.trim().length < 2}
          style={({ pressed }) => [styles.send, (asking || draft.trim().length < 2) && styles.sendOff, pressed && styles.pressed]}
        >
          <ArrowUp size={22} color={colors.white} strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.chips}>
        {PROMPTS.map((p) => (
          <Pressable key={p} accessibilityRole="button" onPress={() => void ask(p)} disabled={asking} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <Text style={styles.chipText}>{p}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const conversation = turns.map((t) => (
    <View key={t.id} style={styles.turn}>
      <View style={styles.question}>
        <Text style={styles.questionText}>{t.question}</Text>
      </View>
      <View style={[styles.card, styles.answer]}>
        <View style={styles.answerHead}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={styles.answerWho}>Co-pilot</Text>
          {t.answer ? <Tag label={t.answer.engine === 'model' ? 'AI model' : 'From your data'} tone={t.answer.engine === 'model' ? 'todo' : 'waiting'} /> : null}
        </View>
        {t.error ? (
          <Text style={styles.error}>{t.error}</Text>
        ) : !t.answer ? (
          <Text style={styles.muted}>Reading your profile, checklist and matches…</Text>
        ) : (
          <>
            <Text style={styles.reply}>{t.answer.reply}</Text>
            {t.answer.note ? <Text style={styles.small}>{t.answer.note}</Text> : null}
            {t.answer.proposals.length ? (
              <View style={styles.suggestions}>
                <Text style={styles.label}>Suggested tasks</Text>
                {t.answer.proposals.map((p) => (
                  <Suggestion key={p.id} task={p} onDecide={(task, a) => void decide(task, a)} busy={busy} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  ));

  const tasksPanel = (
    <Panel title="Your tasks" sub="What you agreed to do. Tick them off as you go.">
      {waiting.length ? (
        <View style={styles.group}>
          <Text style={styles.label}>Waiting for your approval</Text>
          {waiting.map((t) => (
            <Suggestion key={t.id} task={t} onDecide={(task, a) => void decide(task, a)} busy={busy} />
          ))}
        </View>
      ) : null}
      {open.length === 0 && waiting.length === 0 ? (
        <Empty text={tasksQ.isLoading ? 'Loading your tasks…' : 'No tasks yet. Ask your co-pilot what to focus on, or add your own.'} />
      ) : null}
      {open.map((t) => (
        <View key={t.id} style={styles.task}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: false }}
            accessibilityLabel={`Mark "${t.title}" as done`}
            onPress={() => void decide(t, 'done')}
            disabled={busy}
            style={styles.check}
          >
            <Circle size={22} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.flex} onPress={t.link ? () => router.push(t.link as never) : undefined} disabled={!t.link}>
            <Text style={styles.taskTitle}>{t.title}</Text>
            <Text style={styles.small}>
              {[due(t.dueDate), t.source === 'copilot' ? 'Suggested by your co-pilot' : 'Added by you', t.link ? 'Tap to open' : null].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        </View>
      ))}
      {finished.map((t) => (
        <View key={t.id} style={[styles.task, styles.taskDone]}>
          <View style={styles.check}>
            <CircleCheckBig size={22} color={colors.success} />
          </View>
          <Text style={[styles.taskTitle, styles.doneText, styles.flex]}>{t.title}</Text>
        </View>
      ))}
      <View style={styles.inputRow}>
        <TextInput
          value={ownTask}
          onChangeText={setOwnTask}
          placeholder="Add your own task"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="A task of your own"
          onSubmitEditing={() => void addOwn()}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={() => void addOwn()} disabled={busy || ownTask.trim().length < 3} style={[styles.send, (busy || ownTask.trim().length < 3) && styles.sendOff]}>
          <Check size={20} color={colors.white} />
        </Pressable>
      </View>
    </Panel>
  );

  const activityPanel = (
    <Panel title="What the co-pilot did" sub="Every question, every look at your data, every suggestion and decision.">
      {(activityQ.data ?? []).length === 0 ? (
        <Empty text="Nothing yet." />
      ) : (
        (activityQ.data ?? []).slice(0, 12).map((a) => (
          <View key={a.id} style={styles.event}>
            <View style={[styles.dot, a.kind === 'asked' && styles.dotAsked, (a.kind === 'approved' || a.kind === 'approve' || a.kind === 'done') && styles.dotDone]} />
            <Text style={[styles.small, styles.flex]}>{a.text}</Text>
          </View>
        ))
      )}
      <View style={styles.safe}>
        <ShieldCheck size={16} color={colors.success} />
        <Text style={[styles.small, styles.flex]}>
          Your co-pilot cannot send messages, share documents, move money or change chama records. You decide every task.
        </Text>
      </View>
    </Panel>
  );

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl {...pull} />}>
      <Columns>
        <Column wide>
          {askBox}
          {conversation}
        </Column>
        <Column>
          {tasksPanel}
          {activityPanel}
        </Column>
      </Columns>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  page: { padding: spacing[2], paddingBottom: spacing[6] },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card },
  askCard: { padding: spacing[2], gap: spacing[1.5] },
  askHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  small: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '800', color: colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[0.5] },
  input: {
    flex: 1,
    minHeight: touchTargetMin,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.grey100,
    paddingHorizontal: spacing[2],
    fontSize: 15,
    color: colors.text,
  },
  send: { width: touchTargetMin, height: touchTargetMin, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing[1.5], borderRadius: radius.full, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  turn: { gap: spacing[1] },
  question: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: spacing[2], paddingVertical: spacing[1.5] },
  questionText: { fontSize: 15, color: colors.white },
  answer: { padding: spacing[2], gap: spacing[1] },
  answerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  answerWho: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  reply: { fontSize: 15, lineHeight: 23, color: colors.text },
  error: { fontSize: 14, color: colors.error },
  suggestions: { gap: spacing[1], marginTop: spacing[1], paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  suggestion: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[1.5], padding: spacing[1.5], borderRadius: radius.sm, backgroundColor: colors.grey100 },
  suggestionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  decide: { flexDirection: 'row', gap: spacing[1] },
  smallButton: { minHeight: 40, paddingHorizontal: spacing[1.5] },
  group: { gap: spacing[1], marginBottom: spacing[1] },
  task: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: spacing[1], borderBottomWidth: 1, borderBottomColor: colors.border },
  taskDone: { opacity: 0.7 },
  check: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  doneText: { textDecorationLine: 'line-through', color: colors.textMuted },
  event: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grey300 },
  dotAsked: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.success },
  safe: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1], padding: spacing[1.5], borderRadius: radius.sm, backgroundColor: colors.successLight },
});
