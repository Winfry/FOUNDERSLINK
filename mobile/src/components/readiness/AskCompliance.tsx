import { ArrowUp, ExternalLink, MessageCircleQuestion, Scale } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../ui/Text';
import { complianceService } from '../../services';
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
          <ExternalLink size={16} color={colors.primary} style={styles.sourceIcon} />
          <View style={styles.sourceText}>
            <Text style={styles.sourceTitle}>{c.title}</Text>
            <Text style={styles.sourceUrl} numberOfLines={1}>{c.url}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function AnswerBubble({ answer }: { answer: ComplianceAskAnswer }) {
  const suggestions = answer.expertSuggestions ?? [];
  if (answer.cannotConfirm) {
    // Not an error: an honest "we don't have an official source for this".
    return (
      <View style={[styles.bubble, styles.left, styles.unsure]}>
        <View style={styles.unsureHead}>
          <Scale size={18} color={colors.primaryDark} />
          <Text style={styles.unsureTitle}>No official source for this yet</Text>
        </View>
        <Text style={styles.bubbleText}>
          {answer.body?.trim() || "I can't answer this from an official source, so I won't guess."}
        </Text>
        <Text style={styles.unsureNext}>{suggestions[0] ?? EXPERT_LINE}</Text>
        <Sources citations={answer.citations} />
      </View>
    );
  }
  return (
    <View style={[styles.bubble, styles.left, styles.answer]}>
      <Text style={styles.bubbleText}>{answer.body}</Text>
      {suggestions.map((s) => (
        <Text key={s} style={styles.suggestion}>{s}</Text>
      ))}
      <Sources citations={answer.citations} />
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
            <View style={styles.emptyIcon}>
              <MessageCircleQuestion size={24} color={colors.primary} />
            </View>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send question"
            disabled={!canSend}
            onPress={() => void send(draft)}
            style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.sendPressed]}
          >
            <ArrowUp size={22} color={colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>General information, not legal advice.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  thread: { flexGrow: 1, padding: spacing[2], gap: spacing[1.5] },

  empty: { flexGrow: 1, justifyContent: 'flex-end', gap: spacing[1] },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[0.5],
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 16, color: colors.textMuted },
  tryLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginTop: spacing[2] },
  chips: { gap: spacing[1], alignItems: 'flex-start' },
  chip: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipPressed: { backgroundColor: colors.primaryLight, transform: [{ scale: 0.97 }] },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  bubble: { maxWidth: '86%', paddingHorizontal: spacing[2], paddingVertical: spacing[1.5], borderRadius: 18, gap: spacing[1] },
  right: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  left: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  answer: { backgroundColor: colors.grey100 },
  questionText: { fontSize: 16, color: colors.white },
  bubbleText: { fontSize: 16, color: colors.text },
  suggestion: { fontSize: 14, color: colors.textMuted },
  thinking: { fontSize: 14, color: colors.textMuted },

  unsure: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#C9DBFB' },
  unsureHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  unsureTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  unsureNext: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },

  sources: { marginTop: spacing[0.5], paddingTop: spacing[1], borderTopWidth: 1, borderTopColor: colors.grey300 },
  sourcesLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], minHeight: touchTargetMin, borderRadius: radius.sm },
  sourcePressed: { opacity: 0.6 },
  sourceIcon: { flexShrink: 0 },
  sourceText: { flex: 1 },
  sourceTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  sourceUrl: { fontSize: 12, color: colors.textMuted },

  composer: {
    paddingHorizontal: spacing[2],
    paddingTop: spacing[1.5],
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
    borderColor: colors.border,
    backgroundColor: colors.grey100,
    paddingHorizontal: spacing[2],
    fontSize: 16,
    color: colors.text,
  },
  send: {
    width: touchTargetMin,
    height: touchTargetMin,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
  sendPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.95 }] },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
