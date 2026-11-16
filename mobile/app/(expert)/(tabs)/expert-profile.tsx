import { rateLine } from '@shared/expert-question';
import { checksInWords, expertStatus, professionById, regulatorOf, shortDate, TRUST } from '@shared/professions';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, ConfirmModal } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { Panel, Row, Tag } from '../../../src/components/overview/parts';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

/**
 * The expert's own page: where she stands with FoundersLink, what it
 * checks for her profession, how members see her, and her account.
 */
export default function ExpertProfile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirming, setConfirming] = useState(false);
  const status = expertStatus({ approvalStatus: user?.approvalStatus ?? 'draft', licenceExpiresAt: user?.expertLicenceExpiresAt });
  const profession = professionById(user?.expertProfession);
  const regulator = regulatorOf(profession);

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

      <Panel title="Your verification" sub={status.line}>
        {profession ? (
          <>
            <Row
              title={`${profession.label} · ${TRUST[profession.trust].label}`}
              line={
                regulator
                  ? `We check you on the ${regulator.name} (${regulator.short}) register.`
                  : TRUST[profession.trust].line
              }
            />
            <Row title="What we check" line={checksInWords(profession.id)} />
            {user?.expertLicenceExpiresAt ? (
              <Row
                title={status.key === 'renewal_required' ? 'Your licence date has passed' : 'Your licence runs to'}
                line={shortDate(user.expertLicenceExpiresAt)}
                right={status.key === 'renewal_required' ? <Text style={styles.go}>Update</Text> : undefined}
                onPress={status.key === 'renewal_required' ? () => router.push('/expert/onboarding') : undefined}
              />
            ) : null}
          </>
        ) : null}
        <Row title="My verification" line="See what FoundersLink checked, or what it still needs." right={<Text style={styles.go}>Open</Text>} onPress={() => router.push('/founder/verify/status')} last />
      </Panel>

      <Panel
        title="Your rate card"
        sub="What you charge. Members see it before they ask you, and the Co-pilot suggests you to those within budget. They pay you directly."
      >
        {(user?.expertRateCard ?? []).length > 0 ? (
          (user?.expertRateCard ?? []).map((i, n, all) => <Row key={i.service} title={rateLine(i)} last={n === all.length - 1} />)
        ) : (
          <Row title="No prices yet" line="Add what you charge, so members know before they ask." right={<Text style={styles.go}>Add</Text>} onPress={() => router.push('/expert/onboarding')} last />
        )}
      </Panel>

      <Panel title="How members see you" sub="Your profession, what you specialise in, and how many sessions you offer each month.">
        <Row title="Edit my expert profile" line="Profession, licence, specialities, rate card and sessions." right={<Text style={styles.go}>Edit</Text>} onPress={() => router.push('/expert/onboarding')} last />
      </Panel>

      <Panel title="Account">
        <Row title="Settings" line="Notifications, privacy, your data and support." right={<Text style={styles.go}>Open</Text>} onPress={() => router.push('/settings')} />
        <Row title="Log out" onPress={() => setConfirming(true)} last />
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
  name: { fontSize: 28, color: colors.primaryDark },
  go: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  email: { fontSize: 14, color: colors.textMuted },
  tag: { flexDirection: 'row', marginTop: spacing[1] },
});
