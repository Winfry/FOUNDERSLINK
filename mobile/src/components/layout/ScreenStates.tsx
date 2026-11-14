import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme/tokens';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonCard } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export function ScreenLoading({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.pad}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/**
 * Shown when a screen could not load. Being refused because she is not
 * verified yet is not an error: it is the next step, so it gets its own
 * message and a button that takes her there.
 */
export function ScreenError({ message, code, onRetry }: { message: string; code?: string; onRetry?: () => void }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.user?.approvalStatus);
  const investor = useAuthStore((s) => s.user?.role === 'investor');

  if (code === 'APPROVAL_REQUIRED' || /must be approved/i.test(message)) {
    const waiting = status === 'submitted' || status === 'in_review';
    return (
      <View style={styles.center}>
        {/* Its own box, so the badge sits centred like the words under it. */}
        <View>
          <Badge label={waiting ? 'Being checked' : 'Not verified yet'} variant={waiting ? 'default' : 'muted'} />
        </View>
        <Text style={styles.title}>{waiting ? "We're checking your details" : 'Verify to open this'}</Text>
        <Text style={styles.desc}>
          {waiting
            ? `This opens as soon as FoundersLink approves you. You can keep exploring ${investor ? 'Discover' : 'your matches and readiness'}.`
            : 'Everyone you meet here has been checked. Verify once, and chamas, connections and chat open for you.'}
        </Text>
        <Button
          title={waiting ? 'See my verification status' : 'Verify to connect'}
          onPress={() => router.push(waiting ? '/founder/verify/status' : '/founder/verify')}
          style={styles.btn}
        />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>We couldn't load this</Text>
      <Text style={styles.desc}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

export function ScreenOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <View>
        <Badge label="Offline" variant="muted" />
      </View>
      <Text style={styles.title}>You are offline</Text>
      <Text style={styles.desc}>Check your connection and try again.</Text>
      {onRetry ? (
        <Button
          title="Retry"
          variant="secondary"
          onPress={onRetry}
          style={styles.btn}
        />
      ) : null}
    </View>
  );
}

export function ScreenEmpty(props: ComponentProps<typeof EmptyState>) {
  return <EmptyState {...props} />;
}

export function InlineRefreshHint() {
  return (
    <View style={styles.refreshRow}>
      <Text style={styles.refreshText}>Pull to refresh</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing[2] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    gap: spacing[1],
  },
  title: { fontSize: 24, color: colors.primaryDark, textAlign: 'center', marginTop: spacing[0.5] },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 360 },
  btn: { marginTop: spacing[2], alignSelf: 'stretch', maxWidth: 360, width: '100%' },
  refreshRow: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  refreshText: { fontSize: 12, color: colors.textMuted },
});
