import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../ui/Button';
import { Text, TextInput } from '../ui/Text';
import { complianceService } from '../../services';
import { answerKind, checkedOn } from '../../lib/compliance-answer';
import type { ComplianceAskAnswer } from '../../types';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

const EXAMPLES = [
  'Do I need a KRA PIN for my business?',
  'What is eTIMS and do I need it?',
  'When must I register for data protection?',
];

const EXPERT_LINE = 'Ask a lawyer or accountant to confirm this for your business.';

type Turn =
  | { id: number; kind: 'question'; text: string }
  | { id: number; kind: 'answer'; answer: ComplianceAskAnswer }
  // The backend said no (for example, the question was too short), or the request failed.
  | { id: number; kind: 'notice'; text: string };

function Sources({ citations }: { citations: ComplianceAskAnswer['citations'] }) {
  if (!citations?.length) return null;
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesLabel}>Sources</Text>
      {citations.map((c, i) => (
        <Pressable
          key={`${c.url}-${i}`}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(c.url).catch(() => undefined)}
          style={({ pressed }) => [styles.source, pressed && styles.sourcePressed]}
        >
          <View style={styles.sourceText}>
            <Text style={styles.sourceTitle}>{c.title}</Text>
            <Text style={styles.sourceUrl} numberOfLines={1}>{c.url}</Text>
            {checkedOn(c.lastVerified) ? <Text style={styles.sourceChecked}>{checkedOn(c.lastVerified)}</Text> : null}
          </View>
          <Text style={styles.sourceOpen}>Open</Text>
        </Pressable>
      ))}
    </View>
  );
}

// "Did this help?": kept with the question so answers can be improved.
function Feedback({ questionId }: { questionId?: string }) {
  const [given, setGiven] = useState<'helpful' | 'not_helpful' | null>(null);
  const [failed, setFailed] = useState(false);
  if (!questionId) return null;
  if (given) {
    return <Text style={styles.feedbackThanks}>Thank you. This helps us improve the answers.</Text>;
  }
  const give = (value: 'helpful' | 'not_helpful') => {
    setFailed(false);
    complianceService.giveFeedback(questionId, value).then(
      () => setGiven(value),
      () => setFailed(true),
    );
  };
  return (
    <View style={styles.feedback}>
      <Text style={styles.feedbackLabel}>{failed ? 'Not sent. Try again?' : 'Did this help?'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Yes, this helped"
        onPress={() => give('helpful')}
        style={({ pressed }) => [styles.feedbackButton, pressed && styles.sourcePressed]}
      >
        <Text style={styles.feedbackText}>Helpful</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="No, this did not help"
        onPress={() => give('not_helpful')}
        style={({ pressed }) => [styles.feedbackButton, pressed && styles.sourcePressed]}
      >
        <Text style={styles.feedbackText}>Not helpful</Text>
      </Pressable>
    </View>
  );
}

function AnswerBubble({ answer }: { answer: ComplianceAskAnswer }) {
  const suggestions = answer.expertSuggestions ?? [];
  const kind = answerKind(answer);
  if (kind === 'answered') {
    return (
      <View style={[styles.bubble, styles.left, styles.answer]}>
        <Text style={styles.bubbleText}>{answer.body}</Text>
        {suggestions.map((s) => (
          <Text key={s} style={styles.suggestion}>{s}</Text>
        ))}
        <Sources citations={answer.citations} />
        <Feedback questionId={answer.id} />
      </View>
    );
  }
  // Quoted: the official words themselves, with their source, but no
  // written answer, so an expert is suggested to explain how it applies.
  // No source: nothing official covers it, and nothing is guessed.
  const quoted = kind === 'quoted';
  return (
    <View style={[styles.bubble, styles.left, styles.unsure]}>
      <Text style={styles.unsureTitle}>{quoted ? 'From the official source' : 'No official source for this yet'}</Text>
      <Text style={styles.bubbleText}>
        {answer.body?.trim() || "I can't answer this from an official source, so I won't guess."}
      </Text>
      <Text style={styles.unsureNext}>{suggestions[0] ?? EXPERT_LINE}</Text>
      <Sources citations={answer.citations} />
      <Feedback questionId={answer.id} />
    </View>
  );
}

export function AskCompliance() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const nextId = useRef(1);
  const scroll = useRef<ScrollView>(null);

  const add = (turn: { kind: 'question'; text: string } | { kind: 'answer'; answer: ComplianceAskAnswer } | { kind: 'notice'; text: string }) =>
    setTurns((t) => [...t, { ...turn, id: nextId.current++ } as Turn]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || waiting) return;
    setDraft('');
    add({ kind: 'question', text: question });
    setWaiting(true);
    try {
      const answer = await complianceService.ask(question);
      add({ kind: 'answer', answer });
    } catch (e) {
      add({ kind: 'notice', text: (e as { message?: string })?.message ?? 'Could not get an answer. Check your connection and try again.' });
    } finally {
      setWaiting(false);
    }
  };

  const canSend = draft.trim().length > 0 && !waiting;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {turns.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ask about the rules for your business</Text>
            <Text style={styles.emptyBody}>
              Answers come from official sources. When there isn't one, we say so instead of guessing.
            </Text>
            <Text style={styles.tryLabel}>Try one of these</Text>
            <View style={styles.chips}>
              {EXAMPLES.map((q) => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  onPress={() => void send(q)}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {turns.map((t) => {
          if (t.kind === 'question') {
            return (
              <View key={t.id} style={[styles.bubble, styles.right]}>
                <Text style={styles.questionText}>{t.text}</Text>
              </View>
            );
          }
          if (t.kind === 'notice') {
            return (
              <View key={t.id} style={[styles.bubble, styles.left, styles.answer]}>
                <Text style={styles.bubbleText}>{t.text}</Text>
              </View>
            );
          }
          return <AnswerBubble key={t.id} answer={t.answer} />;
        })}

        {waiting ? (
          <View style={[styles.bubble, styles.left, styles.answer]} accessibilityLiveRegion="polite">
            <Text style={styles.thinking}>Checking official sources…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question"
            accessibilityLabel="Your question"
            editable={!waiting}
            returnKeyType="send"
            onSubmitEditing={() => void send(draft)}
            style={styles.input}
          />
          <Button title="Send" accessibilityLabel="Send question" disabled={!canSend} onPress={() => void send(draft)} style={styles.send} />
        </View>
        <Text style={styles.disclaimer}>General information, not legal advice.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  thread: { flexGrow: 1, padding: spacing[2], gap: 10 },

  empty: { flexGrow: 1, justifyContent: 'flex-end', gap: spacing[1] },
  emptyTitle: { fontSize: 24, color: colors.primaryDark },
  emptyBody: { fontSize: 14, color: colors.textMuted },
  tryLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing[2] },
  chips: { gap: spacing[1], alignSelf: 'stretch' },
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

  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: spacing[1.5], borderRadius: 18, gap: spacing[1] },
  right: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  left: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  answer: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  questionText: { fontSize: 15, color: colors.white },
  bubbleText: { fontSize: 15, color: colors.text },
  suggestion: { fontSize: 13, color: colors.textMuted },
  thinking: { fontSize: 14, color: colors.textMuted },

  unsure: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primaryBorder },
  unsureTitle: { fontSize: 13, fontWeight: '500', color: colors.primaryDark },
  unsureNext: { fontSize: 13, fontWeight: '500', color: colors.primaryDark },

  sources: { marginTop: spacing[0.5], paddingTop: spacing[1], borderTopWidth: 1, borderTopColor: colors.border },
  sourcesLabel: { fontSize: 12, color: colors.textMuted },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], minHeight: touchTargetMin, borderRadius: radius.sm },
  sourcePressed: { opacity: 0.6 },
  sourceText: { flex: 1 },
  sourceTitle: { fontSize: 14, fontWeight: '500', color: colors.primary },
  sourceUrl: { fontSize: 12, color: colors.textMuted },
  sourceChecked: { fontSize: 12, color: colors.textMuted },
  sourceOpen: { fontSize: 13, fontWeight: '500', color: colors.primary },

  feedback: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[0.5] },
  feedbackLabel: { flexGrow: 1, fontSize: 13, color: colors.textMuted },
  feedbackButton: {
    minHeight: 36,
    paddingHorizontal: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryLine,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  feedbackText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  feedbackThanks: { fontSize: 13, color: colors.textMuted, marginTop: spacing[0.5] },

  composer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: spacing[1],
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
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
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});