import { freeFirst, priceFor, rateLine } from '@shared/expert-question';
import { professionById, trustWords } from '@shared/professions';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Avatar, Button } from '../ui';
import { Text } from '../ui/Text';
import { useToast } from '../ui/Toast';
import { Tag } from '../overview/parts';
import { expertService, type ExpertCard } from '../../services';
import { colors, radius, spacing } from '../../theme/tokens';
import { ReportExpert } from './ReportExpert';

const professionTitle = (profession: string) => professionById(profession)?.label ?? 'Expert';

/**
 * One verified expert: who she is, how she was checked (in words), why she
 * fits, her sessions left, the ask, and "Report this expert". Used by the
 * Co-pilot and by "Who you may need now" in a deal room.
 */
export function ExpertResult({ e, question, area }: { e: ExpertCard; question: string; /** Her need, so the right price shows. */ area?: string | null }) {
  const { show } = useToast();
  const [asking, setAsking] = useState(false);
  const [topic, setTopic] = useState(question);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const first = e.full_name.split(' ')[0];
  const full = e.office_hours.left_this_month === 0;
  const card = e.rate_card ?? [];
  const price = priceFor(card, area);
  const [seeCard, setSeeCard] = useState(false);

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
          <Text style={styles.org}>{[professionTitle(e.profession), e.organisation_name].filter(Boolean).join(' · ')}</Text>
        </View>
        {e.verification ? <Tag label={e.verification.label} tone="done" /> : null}
      </View>
      {/* How she was checked, in words, and what that means. */}
      {e.verification ? (
        <View style={styles.trust} accessibilityLabel={`${trustWords(e.verification)}. ${e.verification.meaning}`}>
          <Text style={styles.trustWords}>{trustWords(e.verification)}</Text>
          <Text style={styles.trustMeaning}>{e.verification.meaning}</Text>
        </View>
      ) : null}
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

      {/* What she charges: the price for this need, then her whole rate card on request. */}
      {card.length > 0 ? (
        <View style={styles.rates}>
          {price ? <Text style={styles.price}>{rateLine(price)}</Text> : null}
          {freeFirst(card) ? <Text style={styles.free}>{card.find((i) => i.unit === 'free')!.service}: free</Text> : null}
          {seeCard ? (
            <View style={styles.cardList}>
              {card.map((i) => (
                <Text key={i.service} style={styles.cardLine}>
                  {rateLine(i)}
                </Text>
              ))}
              <Text style={styles.payNote}>You pay {first} directly. FoundersLink never handles the money.</Text>
            </View>
          ) : null}
          <Pressable onPress={() => setSeeCard((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: seeCard }} hitSlop={6}>
            <Text style={styles.cardToggle}>{seeCard ? 'Hide rate card' : `See ${first}’s rate card`}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.payNote}>No rate card yet. Ask {first} for a price.</Text>
      )}
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
      <ReportExpert expertId={e.user_id} name={e.full_name} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  expert: { gap: spacing[1], paddingTop: spacing[1.5], marginTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  org: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 12, color: colors.textMuted },
  trust: { gap: 2, paddingVertical: spacing[1], paddingHorizontal: spacing[1.5], borderRadius: radius.md, backgroundColor: colors.primaryLight },
  trustWords: { fontSize: 13, fontWeight: '500', color: colors.primary },
  trustMeaning: { fontSize: 12, color: colors.textMuted },
  reasons: { gap: 4 },
  reason: { fontSize: 14, color: colors.text },
  n: { fontSize: 12, color: colors.textDim },
  bio: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  rates: { gap: 3 },
  price: { fontSize: 14, fontWeight: '500', color: colors.text },
  free: { fontSize: 13, color: colors.success },
  cardList: { gap: 3, paddingVertical: spacing[1], paddingHorizontal: spacing[1.5], borderRadius: radius.md, backgroundColor: colors.background },
  cardLine: { fontSize: 13, color: colors.text },
  payNote: { fontSize: 12, color: colors.textMuted },
  cardToggle: { fontSize: 13, fontWeight: '500', color: colors.primary, paddingVertical: 2 },
  slots: { fontSize: 12, color: colors.textMuted },
  sent: { fontSize: 13, color: colors.success, fontWeight: '500' },
  ask: { gap: spacing[1] },
  topic: { minHeight: 64, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing[1.5], fontSize: 14, color: colors.text, backgroundColor: colors.white, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', gap: spacing[1] },
});
