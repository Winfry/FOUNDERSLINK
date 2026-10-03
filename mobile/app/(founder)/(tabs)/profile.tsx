import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{user?.fullName}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Button title="Account settings" variant="secondary" onPress={() => router.push('/settings')} style={styles.btn} />
      <Button title="Log out" variant="ghost" onPress={async () => { await logout(); router.replace('/welcome'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, padding: spacing[3], paddingTop: spacing[6] },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  email: { color: colors.textMuted, marginTop: 4, marginBottom: spacing[4] },
  btn: { alignSelf: 'flex-start' },
});
