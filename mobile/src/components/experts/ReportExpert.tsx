import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../ui';
import { Text } from '../ui/Text';
import { expertService } from '../../services';
import { colors, radius, spacing } from '../../theme/tokens';

const MIN = 5;

/**
 * "Report this expert", under every expert a member sees. It goes to the
 * staff's Reports page. What happens next is said plainly: a person looks
 * into it, the expert can respond, and one report alone never removes
 * anyone. Reports from three different members pause a profile until a
 * person has looked (TEAM_DECISIONS D7).
 */
export function ReportExpert({ expertId, name }: { expertId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = name.split(' ')[0];

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await expertService.report(expertId, reason.trim());
      setDone(true);
      setOpen(false);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(err.code === 'ALREADY_REPORTED' ? 'You have already reported this expert. A person at FoundersLink is looking into it.' : (err.message ?? 'That did not send. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Text style={styles.done} accessibilityLiveRegion="polite">
        Thank you. A person at FoundersLink will look into it, and {first} can respond before anything is decided.
      </Text>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Report ${name}`} style={styles.link} hitSlop={8}>
        <Text style={styles.linkText}>Report this expert</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>What happened?</Text>
      <Text style={styles.hint}>
        For example, asking for money outside a session, or saying they hold a licence they do not. Only FoundersLink staff read
        this. {first} can respond, and one report alone never removes anyone.
      </Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={500}
        style={styles.input}
        accessibilityLabel={`What happened with ${name}`}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <Button title="Send report" variant="destructive" size="sm" loading={busy} disabled={reason.trim().length < MIN} onPress={() => void send()} />
        <Button title="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
  box: { gap: spacing[1], padding: spacing[1.5], borderRadius: radius.md, backgroundColor: colors.background },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing[1.5],
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  error: { fontSize: 13, color: colors.error },
  buttons: { flexDirection: 'row', gap: spacing[1] },
  done: { fontSize: 13, lineHeight: 19, color: colors.success },
});
