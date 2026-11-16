import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AiMark, Button, Card } from '../ui';
import { Text } from '../ui/Text';
import { Column, Columns, Panel } from '../overview/parts';
import { PageTitle } from '../layout/PageTitle';
import { expertService, type ExpertFindResult } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import { useWideLayout } from '../../hooks/useWideLayout';
import { colors, radius, spacing } from '../../theme/tokens';
import { ExpertResult } from './ExpertResultCard';

// What she could ask, for her side of a deal.
const PROMPTS: Record<'founder' | 'investor', string[]> = {
  investor: [
    'I want to invest in a farming business. Which advocates know land law?',
    'Who can do a land search for a farm in Nakuru for under KES 7,000?',
    'Who can check a business’s books before I invest?',
    'I need help reading a term sheet',
    'Nani anajua sheria ya ardhi Nakuru?',
  ],
  founder: [
    'I’m preparing to raise investment. Who will I need?',
    'Who can get my books ready before investors check them?',
    'The investor has agreed. Who helps me close the deal?',
    'Nahitaji wakili wa kampuni Nairobi',
  ],
};

const INTRO =
  'Tell me what you are looking at, in your own words. I will explain what to check, and find verified experts who can help you. You decide who to talk to.';

// A question with these words is answered in Kiswahili.
const isKiswahili = (q: string) => /\b(nani|nahitaji|naomba|sheria|ardhi|wakili|shamba|mhasibu|kodi|biashara|langu|yangu)\b/i.test(q);

interface Turn {
  id: number;
  question: string;
  result?: ExpertFindResult;
  error?: string;
}

/** An answer: what to know, then either the step-by-step path or the experts. */
function Answer({ result, question }: { result: ExpertFindResult; question: string }) {
  const plan = result.plan ?? null;
  return (
    <Card>
      <View style={styles.person}>
        <AiMark size={32} />
        <Text style={[styles.label, styles.flex]}>
          {plan ? 'Who you may need, step by step' : result.understood.practice_area_label ? `What to know · ${result.understood.practice_area_label}` : 'What to know'}
        </Text>
      </View>
      <Text style={styles.explain}>{result.explanation}</Text>

      {plan ? (
        plan.map((s, i) => (
          <View key={s.need} style={styles.step}>
            <Text style={styles.stepLabel}>
              {String(i + 1).padStart(2, '0')} · {s.step}
            </Text>
            <Text style={styles.stepWho}>{s.who}</Text>
            <Text style={styles.stepWhy}>{s.why}</Text>
            {s.expert ? (
              <ExpertResult e={s.expert} question={`${s.who}: ${s.why}`} area={s.area} />
            ) : (
              <Text style={styles.none}>No verified expert offers this on FoundersLink yet.</Text>
            )}
          </View>
        ))
      ) : (
        <>
          <Text style={[styles.label, styles.gap]}>{result.experts.length ? 'Verified experts who can help' : 'No verified expert fits this yet'}</Text>
          {result.experts.map((e) => (
            <ExpertResult key={e.user_id} e={e} question={question} area={result.understood.practice_area} />
          ))}
        </>
      )}
      <Text style={styles.note}>{result.note}</Text>
    </Card>
  );
}

/**
 * "Who can help me with...?" Any member asks in her own words, in English
 * or Kiswahili: an investor new to farming asks who knows land law; a
 * founder preparing to raise asks who she will need, and gets the whole
 * path, step by step. The guide says what to check in plain words and
 * suggests verified experts, each with why they fit. It never gives the
 * advice itself, and nothing is booked until she sends a request.
 */
export function ExpertFinder({
  title = 'Co-pilot',
  subtitle = 'Ask who can help you check a business before you invest.',
  initialQuestion,
}: {
  title?: string;
  subtitle?: string;
  /** Asked straight away, e.g. from a link in a deal room. */
  initialQuestion?: string;
}) {
  const wide = useWideLayout();
  const role = useAuthStore((s) => s.user?.role);
  const prompts = PROMPTS[role === 'investor' ? 'investor' : 'founder'];
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);

  const ask = async (question: string) => {
    const q = question.trim();
    if (q.length < 5 || busy) return;
    const id = Date.now();
    setTurns((t) => [...t, { id, question: q }]);
    setText('');
    setBusy(true);
    try {
      const result = await expertService.find(q, isKiswahili(q) ? 'sw' : 'en');
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, result } : x)));
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'That did not go through. Check your connection and try again.';
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: message } : x)));
    } finally {
      setBusy(false);
    }
  };

  // A question handed over by a link is asked once, as if she had typed it.
  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      void ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const conversation = (
    <>
      <Card style={styles.intro}>
        <View style={styles.person}>
          <AiMark size={40} />
          <View style={styles.flex}>
            <Text style={styles.name}>Ask who can help</Text>
            <Text style={styles.org}>{INTRO}</Text>
          </View>
        </View>
        {turns.length === 0 ? (
          <View style={styles.prompts}>
            <Text style={styles.label}>You could ask</Text>
            {prompts.map((p) => (
              <Pressable key={p} onPress={() => void ask(p)} accessibilityRole="button" style={({ pressed }) => [styles.prompt, pressed && styles.pressed]}>
                <Text style={styles.promptText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      {turns.map((t) => (
        <View key={t.id} style={styles.turn}>
          <View style={styles.mine}>
            <Text style={styles.mineText}>{t.question}</Text>
          </View>
          {t.error ? (
            <Card>
              <Text style={styles.org}>{t.error}</Text>
              <Button title="Try again" variant="secondary" onPress={() => void ask(t.question)} style={styles.retry} />
            </Card>
          ) : !t.result ? (
            <Card>
              <Text style={styles.org}>Looking for the right people…</Text>
            </Card>
          ) : (
            <Answer result={t.result} question={t.question} />
          )}
        </View>
      ))}

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask in your own words…"
          placeholderTextColor={colors.textDim}
          multiline
          style={styles.input}
          accessibilityLabel="Your question"
          onSubmitEditing={() => void ask(text)}
        />
        <Button title="Ask" loading={busy} disabled={text.trim().length < 5} onPress={() => void ask(text)} />
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <PageTitle title={title} subtitle={subtitle} />
        {wide ? (
          <Columns>
            <Column wide>{conversation}</Column>
            <Column>
              <Panel title="How it works" sub="The guide finds people. The people give the advice.">
                <Text style={styles.how}>01  Ask in your own words, in English or Kiswahili.</Text>
                <Text style={styles.how}>02  The guide says what to check, in plain words, or who you may need at each step.</Text>
                <Text style={styles.how}>03  It suggests verified experts, each checked against their own regulator’s register (LSK, ICPAK, BORAQS…), a qualification, or references.</Text>
                <Text style={styles.how}>04  You choose who to ask. Nothing is booked until you send a request.</Text>
              </Panel>
            </Column>
          </Columns>
        ) : (
          conversation
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  pressed: { opacity: 0.85 },
  intro: { gap: spacing[1.5] },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  org: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 12, color: colors.textMuted },
  gap: { marginTop: spacing[2] },
  prompts: { gap: spacing[1] },
  prompt: { borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.white },
  promptText: { fontSize: 14, color: colors.primary },
  turn: { gap: spacing[1] },
  mine: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary, borderRadius: 16, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 },
  mineText: { fontSize: 14, lineHeight: 20, color: colors.white },
  retry: { marginTop: spacing[1], alignSelf: 'flex-start' },
  explain: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: spacing[1] },
  step: { marginTop: spacing[2], paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  stepLabel: { fontSize: 12, color: colors.accentText, fontWeight: '500' },
  stepWho: { fontSize: 16, fontWeight: '500', color: colors.text, marginTop: 2 },
  stepWhy: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  none: { fontSize: 13, color: colors.textDim, marginTop: spacing[1] },
  note: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: spacing[2] },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[1], marginTop: spacing[1] },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing[1.5], paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.white },
  how: { fontSize: 14, lineHeight: 21, color: colors.text, marginBottom: spacing[1] },
});
