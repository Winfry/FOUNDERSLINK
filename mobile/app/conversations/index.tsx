import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Handshake, MessageCircle, UsersRound } from 'lucide-react-native';
import { Text } from '../../src/components/ui/Text';
import { Avatar } from '../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { conversationService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import type { ConversationSummary } from '../../src/types';
import { colors, radius, spacing } from '../../src/theme/tokens';

const AVATAR = 48;

// Today shows the time, this year the day, older the year too.
function shortTime(at: string) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString(
    'en-KE',
    d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

const ROOM = {
  deal: { label: 'Deal room', Icon: Handshake },
  circle: { label: 'Chama', Icon: UsersRound },
} as const;

function Row({ item, onPress }: { item: ConversationSummary; onPress: () => void }) {
  const room = item.type === 'direct' ? null : ROOM[item.type];
  const unread = item.unreadCount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${room ? `, ${room.label}` : ''}${unread ? `, ${item.unreadCount} unread` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {room ? (
        <View style={styles.roomAvatar}>
          <room.Icon size={22} color={colors.white} />
        </View>
      ) : (
        <Avatar name={item.title} size={AVATAR} />
      )}
      <View style={styles.words}>
        <View style={styles.line}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.time, unread && styles.timeUnread]}>{shortTime(item.updatedAt)}</Text>
        </View>
        <View style={styles.line}>
          {room ? (
            <View style={styles.roomLabel}>
              <Text style={styles.roomLabelText}>{room.label}</Text>
            </View>
          ) : null}
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {item.lastMessagePreview ?? 'No messages yet. Say hello.'}
          </Text>
          {unread ? (
            <View style={styles.unread}>
              <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ConversationsScreen() {
  const router = useRouter();
  const isFounder = useAuthStore((s) => s.user?.role) === 'founder';
  const q = useQuery({ queryKey: ['conversations'], queryFn: () => conversationService.list(), refetchInterval: 15000 });

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError && !q.data) {
    const e = q.error as { message?: string; code?: string } | null;
    return <ScreenError message={e?.message ?? 'Check your connection and try again.'} code={e?.code} onRetry={() => void q.refetch()} />;
  }
  if (!q.data?.length) {
    return (
      <ScreenEmpty
        icon={MessageCircle}
        title="No chats yet"
        description={
          isFounder
            ? 'A chat opens when an investor accepts your join request. Start by finding investors that fit.'
            : 'A chat opens when you accept a join request.'
        }
        actionLabel={isFounder ? 'See my investor matches' : undefined}
        onAction={isFounder ? () => router.push('/matches') : undefined}
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={q.data}
      keyExtractor={(c) => c.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <Row item={item} onPress={() => router.push(`/conversations/${item.id}`)} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  list: { paddingVertical: spacing[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    minHeight: 72,
  },
  rowPressed: { backgroundColor: colors.grey100 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing[2] + AVATAR + spacing[1.5] },
  roomAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flex: 1, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  time: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  timeUnread: { color: colors.text },
  roomLabel: { backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: spacing[1], paddingVertical: 2 },
  roomLabelText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  preview: { flex: 1, fontSize: 14, color: colors.textMuted },
  previewUnread: { color: colors.text, fontWeight: '600' },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
});
