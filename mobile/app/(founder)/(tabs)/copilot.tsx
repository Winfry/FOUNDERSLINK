import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AiMark, Badge, Button, Eyebrow } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { useToast } from '../../../src/components/ui/Toast';
import { Column, Columns, Empty, Panel, PhoneBand, Tag } from '../../../src/components/overview/parts';
import { copilotService, type CopilotAnswer, type CopilotTask, type TaskAction } from '../../../src/services';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { colors, radius, shadows, spacing, touchTargetMin } from '../../../src/theme/tokens';

const PROMPTS = [
  'What should I focus on this week?',
  'Am I ready to pitch investors?',
  'Which experts could help me?',
  'Nisaidie kupanga wiki hii',
];

const INTRO =
  "Hello. I'm your FoundersLink guide. I read your profile, your checklist and your matches. I can suggest things to do, but you decide.";

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

/** A suggested task, in a gold-tinted card, with the founder's decision on it. */
function Suggestion({ task, onDecide, busy }: { task: CopilotTask; onDecide: (t: CopilotTask, a: TaskAction) => void; busy: boolean }) {
  const decided = task.status !== 'proposed';
  return (
    <View style={styles.suggestion}>
      <Eyebrow label="Suggested for your list" />
      <Text style={styles.suggestionTitle}>{task.title}</Text>
      {task.detail ? <Text style={styles.muted}>{task.detail}</Text> : null}
      {due(task.dueDate) ? <Text style={styles.small}>{due(task.dueDate)}</Text> : null}
      {decided ? (
        <View style={styles.decided}>
          <Tag label={task.status === 'open' ? 'Added' : task.status === 'done' ? 'Done' : 'Not now'} tone={task.status === 'open' ? 'done' : 'todo'} />
        </View>
      ) : (
        <View style={styles.decide}>
          <Button
            title="Add to my list"
            size="sm"
            onPress={() => onDecide(task, 'approve')}
            disabled={busy}
            accessibilityLabel={`Add "${task.title}" to my list`}
            style={styles.flex}
          />
          <Button
            title="Not now"
            size="sm"
            variant="ghost"
            onPress={() => onDecide(task, 'dismiss')}
            disabled={busy}
            accessibilityLabel={`Not now: "${task.title}"`}
            style={styles.flex}
          />
        </View>
      )}
    </View>
  );
}

/**
 * The founder's AI guide (her business co-pilot). It reads her own
 * FoundersLink data (profile, readiness, matches, experts), plans what to
 * do next, and suggests tasks. A suggestion is added to her list only when
 * she approves it, and everything it did is listed below.
 */
export default function CopilotScreen() {
  const router = useRouter();
  const wide = useWideLayout();
  const qc = useQueryClient();
  const { show } = useToast();
  const params = useLocalSearchParams<{ ask?: string }>();
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownTask, setOwnTask] = useState('');

  // Opened from another screen with a question ready ("Talk to an expert" on Readiness).
  useEffect(() => {
    if (typeof params.ask === 'string' && params.ask.trim()) setDraft(params.ask);
  }, [params.ask]);

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
    setTurns((t) => [...t, { id, question }]);
    setAsking(true);
    try {
      const answer = await copilotService.ask(question);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Your guide did not answer. Check your connection and try again.';
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
  const asked = new Set(turns.map((t) => t.question));
  const left = PROMPTS.filter((p) => !asked.has(p));
  const canAsk = !asking && draft.trim().length >= 2;

  const headWords = (
    <View style={styles.flex}>
      <Text style={wide ? styles.wideTitle : styles.bandTitle} accessibilityRole="header">
        Your guide
      </Text>
      <Text style={wide ? styles.wideSub : styles.bandSub}>Ask anything about getting funded.</Text>
    </View>
  );
  const header = wide ? (
    <View style={styles.wideHead}>
      <AiMark size={48} />
      {headWords}
    </View>
  ) : (
    <PhoneBand>
      <View style={styles.bandRow}>
        <AiMark />
        {headWords}
      </View>
    </PhoneBand>
  );

  const composer = (
    <View style={[styles.composer, wide && styles.composerWide]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Type your question…"
        placeholderTextColor={colors.textDim}
        accessibilityLabel="Your question for the co-pilot"
        onSubmitEditing={() => void ask(draft)}
        returnKeyType="send"
        editable={!asking}
        style={styles.input}
      />
      <Button title="Send" accessibilityLabel="Ask the co-pilot" onPress={() => void ask(draft)} disabled={!canAsk} style={styles.send} />
    </View>
  );

  const chat = (
    <View style={styles.chat}>
      <Text style={styles.aiNote}>
        This guide is AI. It reads your profile, checklist and matches, and it can make mistakes, so check before you act. A task is added to your list only when you approve it.
      </Text>
      <View style={[styles.bubble, styles.guide]}>
        <Text style={styles.reply}>{INTRO}</Text>
      </View>
      {turns.map((t) => (
        <View key={t.id} style={styles.turn}>
          <View style={[styles.bubble, styles.me]}>
            <Text style={styles.questionText}>{t.question}</Text>
          </View>
          <View style={[styles.bubble, styles.guide]} accessibilityLiveRegion="polite">
            {t.error ? (
              <Text style={styles.error}>{t.error}</Text>
            ) : !t.answer ? (
              <Text style={styles.muted}>Reading your profile, checklist and matches…</Text>
            ) : (
              <>
                <Text style={styles.reply}>{t.answer.reply}</Text>
                {t.answer.note ? <Text style={styles.small}>{t.answer.note}</Text> : null}
                <Text style={styles.engine}>{t.answer.engine === 'model' ? 'Written by an AI model' : 'Worked out from your data'}</Text>
              </>
            )}
          </View>
          {t.answer?.proposals.map((p) => (
            <Suggestion key={p.id} task={p} onDecide={(task, a) => void decide(task, a)} busy={busy} />
          ))}
        </View>
      ))}
      {!asking && left.length ? (
        <>
          <Text style={styles.label}>You could ask</Text>
          <View style={styles.chips}>
            {left.map((p) => (
              <Pressable key={p} accessibilityRole="button" onPress={() => void ask(p)} disabled={asking} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                <Text style={styles.chipText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

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
        <Empty text={tasksQ.isLoading ? 'Loading your tasks…' : 'No tasks yet. Ask your guide what to focus on, or add your own.'} />
      ) : null}
      {open.map((t) => (
        <View key={t.id} style={styles.task}>
          <Pressable style={styles.flex} onPress={t.link ? () => router.push(t.link as never) : undefined} disabled={!t.link}>
            <Text style={styles.taskTitle}>{t.title}</Text>
            <Text style={styles.small}>
              {[due(t.dueDate), t.source === 'copilot' ? 'Suggested by your guide' : 'Added by you', t.link ? 'Tap to open' : null].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
          <Button
            title="Done"
            size="sm"
            variant="secondary"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: false, disabled: busy }}
            accessibilityLabel={`Mark "${t.title}" as done`}
            onPress={() => void decide(t, 'done')}
            disabled={busy}
          />
        </View>
      ))}
      {finished.map((t) => (
        <View key={t.id} style={[styles.task, styles.taskDone]}>
          <Text style={[styles.taskTitle, styles.doneText, styles.flex]}>{t.title}</Text>
          <Badge label="Done" variant="success" />
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          value={ownTask}
          onChangeText={setOwnTask}
          placeholder="Add your own task"
          placeholderTextColor={colors.textDim}
          accessibilityLabel="A task of your own"
          onSubmitEditing={() => void addOwn()}
          style={styles.input}
        />
        <Button
          title="Add"
          variant="secondary"
          accessibilityLabel="Add task"
          onPress={() => void addOwn()}
          disabled={busy || ownTask.trim().length < 3}
          style={styles.send}
        />
      </View>
    </Panel>
  );

  const activityPanel = (
    <Panel title="What your guide did" sub="Every question, every look at your data, every suggestion and decision.">
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
      <Text style={styles.safe}>
        Your guide cannot send messages, share documents, move money or change chama records. You decide every task.
      </Text>
    </Panel>
  );

  if (wide) {
    return (
      <ScrollView contentContainerStyle={styles.pageWide} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl {...pull} />}>
        {header}
        <Columns>
          <Column wide>
            {chat}
            {composer}
          </Column>
          <Column>
            {tasksPanel}
            {activityPanel}
          </Column>
        </Columns>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl {...pull} />}>
        {header}
        {chat}
        {tasksPanel}
        {activityPanel}
      </ScrollView>
      {composer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[3], gap: spacing[1.5] },
  pageWide: { padding: spacing[3], paddingBottom: spacing[6], gap: spacing[1] },

  wideHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[2] },
  wideTitle: { fontSize: 40, color: colors.primaryDark },
  wideSub: { fontSize: 14, color: colors.textMuted, marginTop: spacing[0.5] },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[1] },
  bandTitle: { fontSize: 24, color: colors.white },
  bandSub: { fontSize: 13, color: colors.onDarkMuted, marginTop: 2 },

  muted: { fontSize: 14, color: colors.textMuted },
  small: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 12, color: colors.textMuted, marginTop: spacing[0.5] },
  error: { fontSize: 14, color: colors.error },

  aiNote: {
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 9,
    marginBottom: spacing[0.5],
  },
  chat: { gap: 10 },
  turn: { gap: 10 },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: spacing[1.5], borderRadius: 18, gap: spacing[1] },
  guide: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  questionText: { fontSize: 15, color: colors.white },
  reply: { fontSize: 15, color: colors.text },
  engine: { fontSize: 12, color: colors.textDim },

  chips: { gap: spacing[1] },
  chip: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryLine,
    backgroundColor: colors.white,
  },
  chipPressed: { backgroundColor: colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.primary },

  suggestion: {
    alignSelf: 'stretch',
    gap: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(227,182,93,0.6)',
    backgroundColor: colors.accentLight,
  },
  suggestionTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  decide: { flexDirection: 'row', gap: spacing[1], marginTop: spacing[1] },
  decided: { marginTop: spacing[0.5] },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerWide: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing[1.5], ...shadows.sm },
  input: {
    flex: 1,
    minHeight: touchTargetMin,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[2],
    fontSize: 15,
    color: colors.text,
  },
  send: { paddingHorizontal: spacing[2] },

  group: { gap: spacing[1], marginBottom: spacing[1] },
  task: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[1], borderBottomWidth: 1, borderBottomColor: colors.border },
  taskDone: { opacity: 0.7 },
  taskTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  doneText: { textDecorationLine: 'line-through', color: colors.textMuted },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1.5] },
  event: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grey300 },
  dotAsked: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.success },
  safe: { fontSize: 13, color: colors.textMuted, marginTop: spacing[1], padding: spacing[1.5], borderRadius: radius.sm, backgroundColor: colors.grey100 },
});
