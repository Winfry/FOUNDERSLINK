import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AiMark, Avatar, Button, Card } from '../ui';
import { Text } from '../ui/Text';
import { useToast } from '../ui/Toast';
import { Column, Columns, Panel, Tag } from '../overview/parts';
import { PageTitle } from '../layout/PageTitle';
import { expertService, type ExpertCard, type ExpertFindResult } from '../../services';
import { useWideLayout } from '../../hooks/useWideLayout';
import { colors, radius, spacing } from '../../theme/tokens';

const PROMPTS = [
  'I want to invest in a farming business. Which advocates know land law?',
  'Who can check a business’s books before I invest?',
  'I need help reading a term sheet',
  'Nani anajua sheria ya ardhi Nakuru?',
];

const INTRO =
  'Tell me what you are looking at, in your own words. I will explain what to check, and find verified experts who can help you. You decide who to talk to.';

// A question with these words is answered in Kiswahili.
const isKiswahili = (q: string) => /\b(nani|nahitaji|naomba|sheria|ardhi|wakili|shamba|mhasibu|kodi|biashara|langu|yangu)\b/i.test(q);

const TITLE: Record<ExpertCard['profession'], string> = { lawyer: 'Advocate', accountant: 'Accountant', mentor: 'Mentor', other: 'Expert' };

interface Turn {
  id: number;
  question: string;
  result?: ExpertFindResult;
  error?: string;
}

/** One verified expert the guide suggests, with why, and the ask. */
function ExpertResult({ e, question }: { e: ExpertCard; question: string }) {
  const { show } = useToast();
  const [asking, setAsking] = useState(false);
  const [topic, setTopic] = useState(question);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const first = e.full_name.split(' ')[0];
  const full = e.office_hours.left_this_month === 0;

  const send = async () => {
    setBusy(true);
    try {
      await expertService.requestSession(e.user_id, topic.trim());
      setSent(true);
      setAsking(false);
      show(`Request sent to ${first}. You can message once they accept.`, 'success');
    } catch (err) {
      show((err as { message?: string })?.message ?? 'That did not send. Check your connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.expert}>
      <View style={styles.person}>
        <Avatar name={e.full_name} size={48} />
        <View style={styles.flex}>
          <Text style={styles.name}>{e.full_name}</Text>
          <Text style={styles.org}>{[TITLE[e.profession], e.organisation_name].filter(Boolean).join(' · ')}</Text>
        </View>
        {e.register_checked ? <Tag label="Verified" tone="done" /> : null}
      </View>
      {e.reasons && e.reasons.length > 0 ? (
        <View style={styles.reasons}>
          {e.reasons.map((r, i) => (
            <Text key={r} style={styles.reason}>
              <Text style={styles.n}>{String(i + 1).padStart(2, '0')}  </Text>
              {r}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.bio}>{e.bio}</Text>
      <Text style={styles.slots}>
        {full ? 'No sessions left this month' : `${e.office_hours.left_this_month} free session${e.office_hours.left_this_month === 1 ? '' : 's'} left this month`}
        {e.helped ? ` · Has helped ${e.helped} ${e.helped === 1 ? 'person' : 'people'}` : ''}
      </Text>

      {sent ? (
        <Text style={styles.sent}>Request sent. {first} will answer in your notifications, and you can then message them.</Text>
      ) : asking ? (
        <View style={styles.ask}>
          <Text style={styles.label}>What would you like help with?</Text>
          <TextInput value={topic} onChangeText={setTopic} multiline style={styles.topic} accessibilityLabel={`What you would like ${first}'s help with`} />
          <View style={styles.buttons}>
            <Button title="Send request" loading={busy} disabled={topic.trim().length < 10} onPress={() => void send()} style={styles.flex} />
            <Button title="Cancel" variant="secondary" onPress={() => setAsking(false)} style={styles.flex} />
          </View>
        </View>
      ) : (
        <Button title={full ? 'Fully booked this month' : `Ask ${first} for a session`} variant="soft" disabled={full} onPress={() => setAsking(true)} />
      )}
    </View>
  );
}

/**
 * "Who can help me with...?" Any member asks in her own words, in English
 * or Kiswahili: an investor new to farming asks who knows land law. The
 * guide says what to check, in plain words, and suggests verified experts,
 * each with why they fit. It never gives the advice itself, and nothing is
 * booked until she sends a request.
 */
export function ExpertFinder({ title = 'Co-pilot', subtitle = 'Ask who can help you check a business before you invest.' }: { title?: string; subtitle?: string }) {
  const wide = useWideLayout();
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

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
            {PROMPTS.map((p) => (
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
            <Card>
              <View style={styles.person}>
                <AiMark size={32} />
                <Text style={[styles.label, styles.flex]}>
                  {t.result.understood.practice_area_label ? `What to know · ${t.result.understood.practice_area_label}` : 'What to know'}
                </Text>
              </View>
              <Text style={styles.explain}>{t.result.explanation}</Text>
              <Text style={[styles.label, styles.gap]}>
                {t.result.experts.length ? 'Verified experts who can help' : 'No verified expert fits this yet'}
              </Text>
              {t.result.experts.map((e) => (
                <ExpertResult key={e.user_id} e={e} question={t.question} />
              ))}
              <Text style={styles.note}>{t.result.note}</Text>
            </Card>
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
                <Text style={styles.how}>02  The guide says what to check, in plain words.</Text>
                <Text style={styles.how}>03  It suggests verified experts: lawyers and accountants checked against the LSK and ICPAK registers.</Text>
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
  expert: { gap: spacing[1], paddingTop: spacing[1.5], marginTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  reasons: { gap: 4 },
  reason: { fontSize: 14, color: colors.text },
  n: { fontSize: 12, color: colors.textDim },
  bio: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  slots: { fontSize: 12, color: colors.textMuted },
  sent: { fontSize: 13, color: colors.success, fontWeight: '500' },
  ask: { gap: spacing[1] },
  topic: { minHeight: 64, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing[1.5], fontSize: 14, color: colors.text, backgroundColor: colors.white, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', gap: spacing[1] },
  note: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: spacing[2] },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[1], marginTop: spacing[1] },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing[1.5], paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.white },
  how: { fontSize: 14, lineHeight: 21, color: colors.text, marginBottom: spacing[1] },
});
