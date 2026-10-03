import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button } from '../../src/components/ui';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [chat, setChat] = useState(true);

  return (
    <>
      <Header title="Notifications" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Row label="Push notifications" value={push} onChange={setPush} />
        <Row label="Email updates" value={email} onChange={setEmail} />
        <Row label="Chat messages" value={chat} onChange={setChat} />
        <View style={styles.locked}>
          <Text style={styles.lockedLabel}>Withdrawal alerts</Text>
          <Text style={styles.lockedHint}>Required — cannot be turned off</Text>
        </View>
        <Button title="Push permission setup" variant="secondary" onPress={() => router.push('/settings/push-permission')} />
      </ScrollView>
    </>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.text, fontSize: 16 },
  locked: { marginTop: spacing[3], padding: spacing[2], backgroundColor: colors.primaryLight, borderRadius: 12 },
  lockedLabel: { fontWeight: '600', color: colors.text },
  lockedHint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
