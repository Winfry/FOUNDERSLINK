import { useState } from 'react';
import { useRouter } from 'expo-router';
import { BadgeCheck, LogOut, Settings, UserRoundPen } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, ConfirmModal } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { Panel, Row, Tag } from '../../../src/components/overview/parts';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

const STATUS: Record<string, { label: string; tone: 'done' | 'waiting' | 'todo' }> = {
  approved: { label: 'Verified expert', tone: 'done' },
  submitted: { label: 'Being reviewed', tone: 'waiting' },
  in_review: { label: 'Being reviewed', tone: 'waiting' },
  needs_info: { label: 'More information needed', tone: 'waiting' },
};

/** The expert's own page: who she is to founders, and her account. */
export default function ExpertProfile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirming, setConfirming] = useState(false);
  const status = STATUS[user?.approvalStatus ?? ''] ?? { label: 'Not verified yet', tone: 'todo' as const };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.me}>
        <Avatar name={user?.fullName ?? 'Expert'} size={72} />
        <View style={styles.flex}>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.tag}>
            <Tag label={status.label} tone={status.tone} />
          </View>
        </View>
      </View>

      <Panel title="How founders see you" sub="Your profession, what you help with, and how many sessions you offer each month.">
        <Row icon={UserRoundPen} title="Edit my expert profile" line="Profession, register, services, sectors and counties." onPress={() => router.push('/expert/onboarding')} />
        <Row icon={BadgeCheck} title="My verification" line="See what FoundersLink checked, or what it still needs." onPress={() => router.push('/founder/verify/status')} last />
      </Panel>

      <Panel title="Account">
        <Row icon={Settings} title="Settings" line="Notifications, privacy, your data and support." onPress={() => router.push('/settings')} />
        <Row icon={LogOut} title="Log out" onPress={() => setConfirming(true)} last />
      </Panel>

      <ConfirmModal
        visible={confirming}
        title="Log out?"
        message="You will need your email and password to log in again."
        confirmLabel="Log out"
        cancelLabel="Stay"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void logout().then(() => router.replace('/auth/login'));
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[2] },
  me: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },
  tag: { flexDirection: 'row', marginTop: spacing[1] },
});
