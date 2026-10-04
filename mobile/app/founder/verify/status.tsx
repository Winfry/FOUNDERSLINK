import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/ui';
import { ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { vettingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';

export default function VerificationStatusScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const q = useQuery({ queryKey: ['vetting'], queryFn: () => vettingService.getApplication() });

  if (q.isLoading) return <ScreenLoading />;

  // What the backend says now comes before what was saved at sign-in.
  const status = q.data?.approvalStatus ?? user?.approvalStatus ?? 'draft';
  let message = 'Complete verification to connect with investors.';
  if (status === 'submitted' || status === 'in_review') {
    message = "We're checking your details. You can keep exploring.";
  }
  if (status === 'needs_info') {
    message = q.data?.decisionReason ?? 'We need more information. Edit and submit again.';
  }
  if (status === 'approved') message = 'You are a verified member. You can connect and message.';
  if (status === 'rejected') message = q.data?.decisionReason ?? 'Your verification was not approved.';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Verification status</Text>
      <Text style={styles.status}>{status.replace(/_/g, ' ')}</Text>
      <Text style={styles.body}>{message}</Text>
      {status === 'needs_info' ? (
        <Button title="Edit and resubmit" onPress={() => router.push('/founder/verify')} />
      ) : null}
      <Button title="Back to matches" variant="secondary" onPress={() => router.replace('/(founder)/(tabs)/matches')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, padding: spacing[3], gap: spacing[2] },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  status: { fontSize: 16, fontWeight: '600', color: colors.primary, textTransform: 'capitalize' },
  body: { color: colors.text, lineHeight: 22 },
});
