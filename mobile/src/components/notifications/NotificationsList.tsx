import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { ScreenError, ScreenLoading } from '../layout/ScreenStates';
import { notificationService } from '../../services';
import type { ApiError, AppNotification } from '../../types';
import { colors, radius, shadows, spacing } from '../../theme/tokens';
import { PageTitle } from '../layout/PageTitle';
import { useWideLayout } from '../../hooks/useWideLayout';
import { Tag, type Tone } from '../overview/parts';

/** What a notification is about, in one small word, worked out from its words. */
function kindOf(n: AppNotification): { label: string; tone: Tone } | null {
  const t = `${n.title} ${n.body}`.toLowerCase();
  if (/deadline|due |overdue|remind|expires/.test(t)) return { label: 'Deadline', tone: 'waiting' };
  if (/verif|approved|vetting|more information/.test(t)) return { label: 'Verification', tone: 'done' };
  if (/document|agreement|term sheet|file|compliance|signed/.test(t)) return { label: 'Document', tone: 'quiet' };
  if (/message|chat|replied/.test(t)) return { label: 'Message', tone: 'todo' };
  if (/request|connect|join|invite/.test(t)) return { label: 'Request', tone: 'todo' };
  return null;
}

/** "2 min ago", "Yesterday", "3 Oct". */
function timeAgo(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const now = new Date();
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (then.getTime() >= startOfToday) {
    const hours = Math.floor(mins / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.ceil((startOfToday - then.getTime()) / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: then.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function NotificationsList() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => notificationService.list() });
  const [marking, setMarking] = useState(false);
  const wide = useWideLayout();

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    void qc.invalidateQueries({ queryKey: ['notifications-badge'] });
  };

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) {
    const e = q.error as unknown as ApiError;
    return <ScreenError message={e?.message ?? 'Check your connection and try again.'} code={e?.code} onRetry={() => void q.refetch()} />;
  }

  const notifications = q.data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  const open = async (n: AppNotification) => {
    // Opening it matters more than marking it: a failed mark must not block her.
    if (!n.read) {
      try {
        await notificationService.markRead(n.id);
        refresh();
      } catch {
        // It stays unread and can be marked next time.
      }
    }
    if (n.link) router.push(n.link as never);
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await notificationService.markAllRead();
      refresh();
      toast.show('All marked as read', 'success');
    } catch (err) {
      toast.show((err as ApiError)?.message ?? 'Could not mark them as read. Try again.', 'error');
    } finally {
      setMarking(false);
    }
  };

  const header = (
    <PageTitle
      title="Notifications"
      subtitle={notifications.length ? (unread > 0 ? `${unread} unread` : "You're all caught up") : undefined}
      right={
        unread > 0 ? (
          // Gold is the one action on the deep purple band; on a computer the title sits on white.
          <Button title="Mark all read" size="sm" variant={wide ? 'secondary' : 'gold'} loading={marking} onPress={() => void markAll()} />
        ) : undefined
      }
    />
  );

  return (
    <FlatList
      data={notifications}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptyBody}>
            When someone asks to connect, sends a message, or your verification moves, you will see it here.
          </Text>
          <Button title="Back to home" variant="secondary" onPress={() => router.replace('/')} style={styles.emptyBtn} />
        </View>
      }
      renderItem={({ item, index }) => {
        const kind = kindOf(item);
        return (
          <Pressable
            onPress={() => void open(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
            style={({ pressed }) => [
              styles.row,
              index === 0 && styles.first,
              index === notifications.length - 1 && styles.last,
              index > 0 && styles.line,
              !item.read && styles.unread,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
                {!item.read ? <Tag label="New" tone="new" /> : null}
              </View>
              <Text style={styles.text}>{item.body}</Text>
              <View style={styles.meta}>
                {kind ? <Tag label={kind.label} tone={kind.tone} /> : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingHorizontal: spacing[2], paddingBottom: spacing[6] },
  // The list reads as one white card: rounded at the top and bottom, a hairline between rows.
  row: {
    backgroundColor: colors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[2],
    paddingVertical: 14,
    minHeight: 56,
  },
  first: { borderTopWidth: 1, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  last: { borderBottomWidth: 1, borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card, ...shadows.sm },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  unread: { backgroundColor: colors.primaryLight },
  rowPressed: { backgroundColor: colors.grey100 },
  body: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  title: { flex: 1, fontSize: 15, color: colors.text },
  titleUnread: { fontWeight: '500' },
  text: { fontSize: 13, color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 2 },
  time: { fontSize: 12, color: colors.textDim },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[3], gap: spacing[1] },
  emptyTitle: { fontSize: 24, color: colors.primaryDark, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 360 },
  emptyBtn: { marginTop: spacing[2], alignSelf: 'stretch', maxWidth: 360, width: '100%' },
});
