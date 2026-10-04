import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function InvestorProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{user?.fullName}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Button title="Matching preferences" variant="secondary" onPress={() => router.push('/investor/onboarding')} />
      <Button title="Account settings" variant="secondary" onPress={() => router.push('/settings')} />
      <Button title="Change password" variant="ghost" onPress={() => router.push('/auth/reset-password')} />
      <Button title="Log out" variant="ghost" onPress={async () => { await logout(); router.replace('/welcome'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, padding: spacing[3], paddingTop: spacing[6], gap: spacing[2] },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted },
});
