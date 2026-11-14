import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button } from '../../../src/components/ui';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { vettingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing } from '../../../src/theme/tokens';

type Tone = 'default' | 'success' | 'warning' | 'error' | 'muted' | 'accent';

interface State {
  /** The state in a few words, on the badge. */
  badge: string;
  tone: Tone;
  title: string;
  body: string;
}

const CHECKING: State = {
  badge: 'Being checked',
  tone: 'default',
  title: "We're checking your details",
  body: 'A person on our team is reading what you sent. You can keep exploring while you wait. Come back here to see the result.',
};

const STATES: Record<string, State> = {
  draft: {
    badge: 'Not verified yet',
    tone: 'muted',
    title: 'Verify to connect',
    body: 'Before you can connect with investors or message them, we check your phone number and a short statement about your business.',
  },
  submitted: CHECKING,
  in_review: CHECKING,
  approved: {
    badge: 'Verified',
    tone: 'success',
    title: "You're verified",
    body: 'You can now connect with investors and message them.',
  },
  needs_info: {
    badge: 'More needed',
    tone: 'warning',
    title: 'We need a little more from you',
    body: 'Update your details and send them again. It only takes a minute.',
  },
  rejected: {
    badge: 'Not approved',
    tone: 'error',
    title: 'Not approved',
    body: 'Your verification was not approved, so you cannot connect with investors for now. You can still explore the app.',
  },
  suspended: {
    badge: 'Paused',
    tone: 'error',
    title: 'Your account is paused',
    body: 'You cannot connect or message for now. You can still explore the app.',
  },
  banned: {
    badge: 'Closed',
    tone: 'error',
    title: 'Your account is closed',
    body: 'You can no longer connect or message on FoundersLink.',
  },
};

export default function VerificationStatusScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const q = useQuery({ queryKey: ['vetting'], queryFn: () => vettingService.getApplication() });

  if (q.isLoading) return <ScreenLoading />;

  // What the backend says now comes before what was saved at sign-in.
  const status = q.data?.approvalStatus ?? user?.approvalStatus ?? 'draft';
  const state = STATES[status] ?? STATES.draft;
  // The words that explain where she is now, from the backend: the
  // reviewer's reason, or why her account was paused.
  const reason = q.data?.statusReason ?? null;
  const reasonLabel = status === 'suspended' || status === 'banned' ? 'Why' : 'What our reviewer said';
  // The opening screen sends each role to her own home.
  const toMatches = () => router.replace('/');
  const investor = user?.role === 'investor';
  const expert = user?.role === 'expert';
  // The same screen serves both roles, so the words follow who is reading.
  const forRole = (text: string) =>
    investor
      ? text.replace(/investors/g, 'founders').replace(/your business/g, 'what you fund').replace(/See your matches/g, 'See founders')
      : expert
        ? text.replace(/investors/g, 'founders').replace(/your business/g, 'how you help founders').replace(/See your matches/g, 'Go to my home')
        : text;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.middle}>
        <Badge label={state.badge} variant={state.tone} />
        <Text style={styles.title} accessibilityRole="header">
          {state.title}
        </Text>
        <Text style={styles.body}>{forRole(state.body)}</Text>
        {reason ? (
          <View style={styles.reason}>
            <Text style={styles.reasonLabel}>{reasonLabel}</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        {status === 'draft' ? <Button title="Start verification" onPress={() => router.push('/founder/verify')} /> : null}
        {status === 'needs_info' ? <Button title="Edit and resubmit" onPress={() => router.push('/founder/verify')} /> : null}
        {status === 'approved' ? <Button title={forRole('See your matches')} onPress={toMatches} /> : null}
        {status === 'draft' || status === 'needs_info' ? (
          <Button title="Back to the app" variant="secondary" onPress={toMatches} />
        ) : status === 'approved' ? null : (
          <Button title={status === 'submitted' || status === 'in_review' ? 'Keep exploring' : 'Back to the app'} onPress={toMatches} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.background, padding: spacing[2], paddingBottom: spacing[4] },
  middle: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing[4], gap: spacing[1.5], maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 34, lineHeight: 38, fontWeight: '300', color: colors.primaryDark, letterSpacing: -0.6 },
  body: { fontSize: 16, color: colors.textMuted },
  reason: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing[2],
    marginTop: spacing[1.5],
    gap: spacing[0.5],
  },
  reasonLabel: { fontSize: 12, color: colors.textMuted },
  reasonText: { fontSize: 16, color: colors.text },
  actions: { gap: spacing[1], maxWidth: 480, width: '100%', alignSelf: 'center' },
});
