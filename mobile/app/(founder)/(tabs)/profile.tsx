import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderProfileTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.name}>{user?.fullName}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>Verification: {user?.approvalStatus.replace(/_/g, ' ')}</Text>
      <Button title="Verify to connect" variant="secondary" onPress={() => router.push('/founder/verify/status')} />
      <Button title="Settings" onPress={() => router.push('/settings')} />
      <Button title="Log out" variant="ghost" onPress={() => void logout().then(() => router.replace('/auth/login'))} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing[3], gap: spacing[2], backgroundColor: colors.white },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted },
});
