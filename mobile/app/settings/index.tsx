import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/layout/Header';
import { colors, spacing, touchTargetMin } from '../../src/theme/tokens';

const LINKS = [
  { label: 'Notification settings', href: '/settings/notifications' },
  { label: 'Security & privacy', href: '/settings/security' },
  { label: 'Language', href: '/settings/language' },
  { label: 'Help & FAQ', href: '/settings/help' },
  { label: 'Contact support', href: '/settings/support' },
  { label: 'Terms of service', href: '/settings/terms' },
  { label: 'Privacy policy', href: '/settings/privacy' },
  { label: 'Delete account request', href: '/settings/delete-account' },
  { label: 'Report / block user', href: '/settings/report' },
];

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {LINKS.map((l) => (
          <Pressable key={l.href} style={styles.row} onPress={() => router.push(l.href as never)}>
            <Text style={styles.label}>{l.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[2] },
  row: { minHeight: touchTargetMin, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 16, color: colors.text },
});
