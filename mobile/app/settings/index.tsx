import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Bell, CircleHelp, FileText, Flag, Languages, LifeBuoy, Lock, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react-native';
import { Header } from '../../src/components/layout/Header';
import { MenuGroup, MenuRow } from '../../src/components/profile/MenuRow';
import { colors, spacing } from '../../src/theme/tokens';

const SECTIONS: { title: string; rows: { label: string; href: string; icon: LucideIcon; destructive?: boolean }[] }[] = [
  {
    title: 'Account',
    rows: [
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
      { label: 'Security', href: '/settings/security', icon: Lock },
      { label: 'Language', href: '/settings/language', icon: Languages },
    ],
  },
  {
    title: 'Privacy and data',
    rows: [
      { label: 'Privacy policy', href: '/settings/privacy', icon: ShieldCheck },
      { label: 'Terms of service', href: '/settings/terms', icon: FileText },
      { label: 'Report or block someone', href: '/settings/report', icon: Flag },
      { label: 'Ask to delete my account', href: '/settings/delete-account', icon: Trash2 },
    ],
  },
  {
    title: 'Help',
    rows: [
      { label: 'Help and common questions', href: '/settings/help', icon: CircleHelp },
      { label: 'Contact support', href: '/settings/support', icon: LifeBuoy },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <>
      {/* After a reload or a link there is nothing to go back to, so it goes home. */}
      <Header title="Settings" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {SECTIONS.map((s) => (
          <MenuGroup key={s.title} title={s.title}>
            {s.rows.map((r, i) => (
              <MenuRow
                key={r.href}
                icon={r.icon}
                label={r.label}
                onPress={() => router.push(r.href as never)}
                last={i === s.rows.length - 1}
              />
            ))}
          </MenuGroup>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[4], gap: spacing[3] },
});
