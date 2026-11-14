import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { MenuGroup, MenuRow } from '../../src/components/profile/MenuRow';
import { colors, spacing } from '../../src/theme/tokens';

const SECTIONS: { title: string; rows: { label: string; href: string; hint: string; destructive?: boolean }[] }[] = [
  {
    title: 'Account',
    rows: [
      { label: 'Notifications', href: '/settings/notifications', hint: 'What we tell you about, and how' },
      { label: 'Security', href: '/settings/security', hint: 'How your account is kept safe' },
    ],
  },
  {
    title: 'Privacy and data',
    rows: [
      { label: 'Your consents', href: '/settings/consents', hint: 'What you have agreed to' },
      { label: 'Download my data', href: '/settings/export', hint: 'A copy of everything we hold' },
      { label: 'Privacy policy', href: '/settings/privacy', hint: 'How we use your information' },
      { label: 'Terms of service', href: '/settings/terms', hint: 'The rules for using FoundersLink' },
      { label: 'Report someone', href: '/settings/report', hint: 'Tell us about a member' },
      { label: 'Delete my account', href: '/settings/delete-account', hint: 'Remove your account for good' },
    ],
  },
  {
    title: 'Help',
    rows: [
      { label: 'Contact support', href: '/settings/support', hint: 'Write to the FoundersLink team' },
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
                label={r.label}
                hint={r.hint}
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
