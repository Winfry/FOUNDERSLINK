import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useRouter } from 'expo-router';
import { CloudOff, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { verificationWords } from '../../lib/verification-state';
import { colors, spacing } from '../../theme/tokens';
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
  const role = useAuthStore((s) => s.user?.role);

  if (code === 'APPROVAL_REQUIRED' || /must be approved/i.test(message)) {
    // What she is told follows where her verification really stands.
    const v = verificationWords(status, role);
    return (
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
          <ShieldCheck size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>{v.kind === 'verify' ? 'Verify to open this' : v.title}</Text>
        <Text style={styles.desc}>{v.body}</Text>
        <Button title={v.action} variant={v.starts ? 'primary' : 'secondary'} onPress={() => router.push(v.href)} style={styles.btn} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={[styles.icon, { backgroundColor: colors.errorLight }]}>
        <AlertCircle size={28} color={colors.error} />
      </View>
      <Text style={styles.title}>We couldn't load this</Text>
      <Text style={styles.desc}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

export function ScreenOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <CloudOff size={40} color={colors.textMuted} />
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
      <RefreshCw size={14} color={colors.textMuted} />
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
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[1] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 16, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  btn: { marginTop: spacing[2], alignSelf: 'stretch' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 8 },
  refreshText: { fontSize: 12, color: colors.textMuted },
});
