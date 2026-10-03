import { StyleSheet, Text } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button } from '../../src/components/ui';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function PushPermissionScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Push notifications" onBack={() => router.back()} />
      <Text style={styles.body}>
        Enable alerts for investor requests, withdrawal approvals, deposits, and group messages. You can change categories later in settings.
      </Text>
      <Button title="Enable notifications" onPress={() => router.back()} />
      <Button title="Not now" variant="ghost" onPress={() => router.back()} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[3], color: colors.textMuted, lineHeight: 22, marginBottom: spacing[2] },
});
