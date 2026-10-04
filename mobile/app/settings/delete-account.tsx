import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileX, Handshake, UserX } from 'lucide-react-native';
import { Button, ConfirmModal, PasswordInput, Textarea } from '../../src/components/ui';
import { Text } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { RadioRow, Row, RowGroup, Section, SettingsPage, useSettingsBack } from '../../src/components/settings/SettingsPage';
import { API_URL } from '../../src/services/http/client';
import { deleteAccount } from '../../src/services/http/account.http';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';

const REASONS = ['I found funding elsewhere', 'I am not getting useful matches', 'I am worried about my data', 'Something else'];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const back = useSettingsBack();
  const { show } = useToast();
  const logout = useAuthStore((s) => s.logout);

  const [reason, setReason] = useState('');
  const [more, setMore] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState('');

  const noReason = tried && !reason;
  const noPassword = tried && !password;

  const ask = () => {
    setTried(true);
    setRefused('');
    if (!reason || !password) return;
    setAsking(true);
  };

  const confirm = async () => {
    // Without the backend this stays the request it always was.
    if (!API_URL) {
      setAsking(false);
      show('Request submitted', 'success');
      back();
      return;
    }
    setBusy(true);
    try {
      const why = more.trim() ? `${reason}: ${more.trim()}` : reason;
      await deleteAccount(password, why);
      setAsking(false);
      show('Your account has been deleted', 'success');
      await logout();
      router.replace('/welcome');
    } catch (e) {
      setAsking(false);
      const message = (e as { message?: string })?.message ?? 'Could not delete your account. Try again.';
      setRefused(message);
      show(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPage
      title="Delete account"
      heading="Delete your account"
      intro="This cannot be undone. Here is exactly what happens when you delete."
    >
      <Section title="What deleting does">
        <RowGroup>
          <Row
            label="Your profile, matches and chats are removed"
            line="Other members can no longer see you or message you."
            right={<UserX size={24} color={colors.textMuted} />}
          />
          <Row
            label="Shared records keep your part without your name"
            line="A closed deal, for example, stays for the other side, with your details made anonymous."
            right={<Handshake size={24} color={colors.textMuted} />}
          />
          <Row
            label="Your files are deleted"
            line="Documents you uploaded for verification or a deal are removed."
            right={<FileX size={24} color={colors.textMuted} />}
            last
          />
        </RowGroup>
      </Section>

      <Section title="Why are you leaving?">
        <RowGroup>
          {REASONS.map((r, i) => (
            <RadioRow key={r} label={r} selected={reason === r} onPress={() => setReason(r)} last={i === REASONS.length - 1} />
          ))}
        </RowGroup>
        {noReason ? <Text style={styles.error}>Choose a reason.</Text> : null}
        <Textarea
          label="Anything else you want us to know (optional)"
          placeholder="What could we have done better?"
          value={more}
          onChangeText={setMore}
          style={styles.area}
        />
      </Section>

      <Section title="Confirm it is you">
        <View>
          <PasswordInput
            label="Your password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setRefused('');
            }}
            error={noPassword ? 'Enter your password.' : refused || undefined}
            autoCapitalize="none"
          />
        </View>
        <Button title="Delete my account" variant="destructive" onPress={ask} />
        <Button title="Keep my account" variant="ghost" onPress={back} />
      </Section>

      <ConfirmModal
        visible={asking}
        title="Delete your account?"
        message="Your profile, matches, chats and files will be removed. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setAsking(false)}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontSize: 14, fontWeight: '500' },
  area: { backgroundColor: colors.white, minHeight: 96, marginTop: spacing[0.5] },
});
