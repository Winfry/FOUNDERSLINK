import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Bell, CalendarClock, FileText, MessageCircle, ShieldCheck, UserPlus, type LucideIcon } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { ScreenError, ScreenLoading } from '../layout/ScreenStates';
import { notificationService } from '../../services';
import type { ApiError, AppNotification } from '../../types';
import { colors, spacing, touchTargetMin } from '../../theme/tokens';

/** The picture for a notification, worked out from its words. */
function iconFor(n: AppNotification): { Icon: LucideIcon; bg: string; fg: string } {
  const t = `${n.title} ${n.body}`.toLowerCase();
  if (/deadline|due |overdue|remind|expires/.test(t)) return { Icon: CalendarClock, bg: colors.warningLight, fg: colors.warning };
  if (/verif|approved|vetting|more information/.test(t)) return { Icon: ShieldCheck, bg: colors.successLight, fg: colors.success };
  if (/document|agreement|term sheet|file|compliance|signed/.test(t)) return { Icon: FileText, bg: colors.primaryLight, fg: colors.primaryDark };
  if (/message|chat|replied/.test(t)) return { Icon: MessageCircle, bg: colors.primaryLight, fg: colors.primary };
  if (/request|connect|join|invite/.test(t)) return { Icon: UserPlus, bg: colors.primaryLight, fg: colors.primary };
  return { Icon: Bell, bg: colors.grey100, fg: colors.textMuted };
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
    <View style={styles.head}>
      <View style={styles.headText}>
        <Text style={styles.heading}>Notifications</Text>
        {notifications.length ? (
          <Text style={styles.sub}>{unread > 0 ? `${unread} unread` : "You're all caught up"}</Text>
        ) : null}
      </View>
      {unread > 0 ? (
        <Pressable
          onPress={() => void markAll()}
          disabled={marking}
          accessibilityRole="button"
          style={({ pressed }) => [styles.markAll, (pressed || marking) && styles.dim]}
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={notifications}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Bell size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nothing new yet</Text>
          <Text style={styles.emptyBody}>
            When someone asks to connect, sends a message, or your verification moves, you will see it here.
          </Text>
          <Button title="Back to home" variant="secondary" onPress={() => router.replace('/')} style={styles.emptyBtn} />
        </View>
      }
      renderItem={({ item }) => {
        const { Icon, bg, fg } = iconFor(item);
        return (
          <Pressable
            onPress={() => void open(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.icon, { backgroundColor: bg }]}>
              <Icon size={20} color={fg} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
              <Text style={styles.text}>{item.body}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingHorizontal: spacing[2], paddingBottom: spacing[6] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[1] },
  headText: { flex: 1 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  markAll: { minHeight: touchTargetMin, justifyContent: 'center', paddingLeft: spacing[1] },
  markAllText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  dim: { opacity: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1.5],
    minHeight: touchTargetMin,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.grey100 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing[0.5] },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  titleUnread: { fontWeight: '700' },
  text: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  time: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[3], gap: spacing[1] },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 16, fontWeight: '500', color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  emptyBtn: { marginTop: spacing[2], alignSelf: 'stretch' },
});
