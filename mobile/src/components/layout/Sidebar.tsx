import { usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { notificationService } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceCounts } from '../../hooks/useWorkspaceCounts';
import { colors, radius, spacing } from '../../theme/tokens';
import { SIDEBAR_WIDTH } from '../../hooks/useWideLayout';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { isActive, workspaceFor, type WorkspaceItem } from './workspace';

const STATUS: Record<string, string> = {
  approved: 'Verified member',
  submitted: 'Verification in review',
  in_review: 'Verification in review',
  needs_info: 'More information needed',
  rejected: 'Not approved',
  suspended: 'Suspended',
  draft: 'Not verified yet',
};

type HoverState = { pressed: boolean; hovered?: boolean };

function Item({ label, count, on, onPress }: { label: string; count?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: on }}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed, hovered }: HoverState) => [styles.item, (on || hovered) && styles.itemOn, pressed && styles.itemPressed]}
    >
      {on ? <View style={styles.edge} /> : null}
      <Text style={[styles.itemText, on && styles.itemTextOn]}>{label}</Text>
      {count ? <Text style={styles.count}>{count}</Text> : null}
    </Pressable>
  );
}

/**
 * The side menu on a computer, as in the approved design: the wordmark,
 * the member's workspace in words with a count beside each place, headings
 * for the groups ("Community", "Assistant"), and who is signed in at the
 * foot. It stays put while the pages beside it change.
 */
export function Sidebar() {
  const router = useRouter();
  const path = usePathname();
  const user = useAuthStore((s) => s.user);
  const ws = workspaceFor(user?.role);
  const role = ws ? (user!.role as 'founder' | 'investor' | 'expert') : null;
  const counts = useWorkspaceCounts(role);
  const notices = useQuery({ queryKey: ['notifications-badge'], queryFn: () => notificationService.list(), enabled: !!ws, refetchInterval: 10000 });
  if (!user || !ws) return null;

  const go = (href: string) => router.navigate(href as never);
  const unread = notices.data?.unreadCount ?? 0;

  return (
    <View style={styles.bar}>
      <Pressable onPress={() => go(ws.home)} accessibilityRole="link" accessibilityLabel="FoundersLink, home">
        <Text style={styles.wordmark}>
          FoundersLink<Text style={styles.wordmarkDot}>.</Text>
        </Text>
      </Pressable>

      <ScrollView style={styles.flex} contentContainerStyle={styles.nav} showsVerticalScrollIndicator={false}>
        {ws.items.map((item: WorkspaceItem, i) => {
          const startsGroup = item.group && item.group !== ws.items[i - 1]?.group;
          return (
            <View key={item.href}>
              {startsGroup ? <Text style={styles.group}>{item.group}</Text> : null}
              <Item label={item.label} count={item.count ? counts[item.count] : undefined} on={isActive(item, path)} onPress={() => go(item.href)} />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.foot}>
        <Item
          label="Notifications"
          count={unread ? String(unread) : undefined}
          on={path.endsWith('/notifications') || path.endsWith('/updates')}
          onPress={() => go(ws.notifications)}
        />
        <Item label="Settings" on={path.startsWith('/settings')} onPress={() => go('/settings')} />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Your profile, ${user.fullName}`}
          onPress={() => go(ws.profile)}
          style={({ hovered }: HoverState) => [styles.me, hovered && styles.meHover]}
        >
          <Avatar name={user.fullName} size={36} ring={false} />
          <View style={styles.flex}>
            <Text style={styles.meName} numberOfLines={1}>{user.fullName}</Text>
            <Text style={styles.meStatus} numberOfLines={1}>{STATUS[user.approvalStatus] ?? ''}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.primaryDark,
    paddingTop: 26,
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[2],
  },
  wordmark: { fontSize: 17, fontWeight: '600', color: colors.white, paddingHorizontal: spacing[1.5], paddingBottom: 28 },
  wordmarkDot: { color: colors.accent },
  nav: { gap: 2 },
  group: { fontSize: 11, color: '#B9ACD4', paddingHorizontal: spacing[1.5], marginTop: 22, marginBottom: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: spacing[1.5],
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  itemOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  itemPressed: { opacity: 0.8 },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent },
  itemText: { flex: 1, fontSize: 14, color: colors.onDarkMuted },
  itemTextOn: { color: colors.white },
  count: { fontSize: 12, color: colors.onDarkDim },
  foot: { gap: 2, paddingTop: spacing[1] },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing[1],
    paddingTop: 14,
    paddingHorizontal: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.onDarkLine,
  },
  meHover: { backgroundColor: 'rgba(255,255,255,0.05)' },
  meName: { fontSize: 13, color: colors.white },
  meStatus: { fontSize: 12, color: '#C8BEDB' },
});
