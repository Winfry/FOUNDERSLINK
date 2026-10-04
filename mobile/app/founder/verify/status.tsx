import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BadgeCheck, CircleSlash, Clock, MessageCircleQuestion, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/ui';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { vettingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing } from '../../../src/theme/tokens';

interface State {
  icon: LucideIcon;
  tint: string;
  ink: string;
  title: string;
  body: string;
}

const CHECKING: State = {
  icon: Clock,
  tint: colors.primaryLight,
  ink: colors.primary,
  title: "We're checking your details",
  body: 'A person on our team is reading what you sent. You can keep exploring while you wait. Come back here to see the result.',
};

const STATES: Record<string, State> = {
  draft: {
    icon: ShieldCheck,
    tint: colors.primaryLight,
    ink: colors.primary,
    title: 'Verify to connect',
    body: 'Before you can connect with investors or message them, we check your phone number and a short statement about your business.',
  },
  submitted: CHECKING,
  in_review: CHECKING,
  approved: {
    icon: BadgeCheck,
    tint: colors.successLight,
    ink: colors.success,
    title: "You're verified",
    body: 'You can now connect with investors and message them.',
  },
  needs_info: {
    icon: MessageCircleQuestion,
    tint: colors.warningLight,
    ink: colors.warning,
    title: 'We need a little more from you',
    body: 'Update your details and send them again. It only takes a minute.',
  },
  rejected: {
    icon: CircleSlash,
    tint: colors.errorLight,
    ink: colors.error,
    title: 'Your verification was not approved',
    body: 'You cannot connect with investors for now. You can still explore the app.',
  },
  suspended: {
    icon: CircleSlash,
    tint: colors.errorLight,
    ink: colors.error,
    title: 'Your account is paused',
    body: 'You cannot connect or message for now. You can still explore the app.',
  },
  banned: {
    icon: CircleSlash,
    tint: colors.errorLight,
    ink: colors.error,
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
  const Icon = state.icon;
  // The admin's own words, when a decision came with a reason. A paused
  // account has its own reason: the note on her application is from the
  // earlier approval, and would be the wrong thing to quote.
  const paused = status === 'suspended' || status === 'banned';
  const reason = paused
    ? status === 'suspended'
      ? q.data?.suspensionReason
      : null
    : status !== 'approved' && status !== 'draft'
      ? q.data?.decisionReason
      : null;
  // The opening screen sends each role to her own home.
  const toMatches = () => router.replace('/');
  const investor = user?.role === 'investor';
  // The same screen serves both roles, so the words follow who is reading.
  const forRole = (text: string) =>
    investor ? text.replace(/investors/g, 'founders').replace(/your business/g, 'what you fund').replace(/See your matches/g, 'See founders') : text;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.middle}>
        <View style={[styles.circle, { backgroundColor: state.tint }]}>
          <Icon size={56} color={state.ink} strokeWidth={1.75} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {state.title}
        </Text>
        <Text style={styles.body}>{forRole(state.body)}</Text>
        {reason ? (
          <View style={styles.reason}>
            <Text style={styles.reasonLabel}>What our reviewer said</Text>
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
  wrap: { flexGrow: 1, backgroundColor: colors.white, padding: spacing[2], paddingBottom: spacing[4] },
  middle: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4] },
  circle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: spacing[1], maxWidth: 320 },
  reason: {
    alignSelf: 'stretch',
    backgroundColor: colors.grey100,
    borderRadius: radius.card,
    padding: spacing[2],
    marginTop: spacing[3],
    gap: spacing[0.5],
  },
  reasonLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  reasonText: { fontSize: 16, color: colors.text },
  actions: { gap: spacing[1.5] },
});
