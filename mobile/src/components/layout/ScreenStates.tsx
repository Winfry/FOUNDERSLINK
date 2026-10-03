import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CloudOff, RefreshCw, AlertCircle } from 'lucide-react-native';
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

export function ScreenError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <AlertCircle size={40} color={colors.error} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.desc}>{message}</Text>
      {onRetry ? (
        <Button title="Try again" onPress={onRetry} style={styles.btn} />
      ) : null}
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
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  btn: { marginTop: spacing[2], alignSelf: 'stretch', maxWidth: 280 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 8 },
  refreshText: { fontSize: 12, color: colors.textMuted },
});
