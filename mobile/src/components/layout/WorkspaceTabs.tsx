import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceCounts } from '../../hooks/useWorkspaceCounts';
import { useCentredPadding, useWideLayout } from '../../hooks/useWideLayout';
import { colors, spacing } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { WORKSPACES } from './workspace';

export interface TabScreen {
  name: string;
  title: string;
  /** Reached from the top bar, a link or the side menu, not shown as a tab. */
  hidden?: boolean;
}

type Role = 'founder' | 'investor' | 'expert';

/** The widest a page's content gets beside the side menu. */
export const PAGE_MAX = 1120;

function Pill({ label, count, onPress }: { label: string; count?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={count ? `${label}, ${count}` : label} style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
      {count ? (
        <View style={styles.pillCount}>
          <Text style={styles.pillCountText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * On a phone: the deep purple bar at the top. The wordmark on the left;
 * on the right, "Messages" with how many are unread, notices when there
 * are new ones, and her photo, which opens her profile. Words, no icons.
 */
function TopBar({ role }: { role: Role }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const name = useAuthStore((s) => s.user?.fullName ?? '');
  const counts = useWorkspaceCounts(role);
  const notices = useQuery({ queryKey: ['notifications-badge'], queryFn: () => notificationService.list(), refetchInterval: 10000 });
  const unread = notices.data?.unreadCount ?? 0;
  const ws = WORKSPACES[role];

  return (
    <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
      <Pressable onPress={() => router.navigate(ws.home as never)} accessibilityRole="link" accessibilityLabel="FoundersLink, home">
        <Text style={styles.wordmark}>
          FoundersLink<Text style={styles.wordmarkDot}>.</Text>
        </Text>
      </Pressable>
      <View style={styles.topRight}>
        {unread > 0 ? <Pill label="New" count={String(unread)} onPress={() => router.navigate(ws.notifications as never)} /> : null}
        <Pill label="Messages" count={counts.messages} onPress={() => router.navigate('/conversations' as never)} />
        <Pressable onPress={() => router.navigate(ws.profile as never)} accessibilityRole="link" accessibilityLabel="Your profile">
          <Avatar name={name || 'Me'} size={32} />
        </Pressable>
      </View>
    </View>
  );
}

/** The gold mark over the tab you are on. */
function TabMark({ focused }: { focused: boolean }) {
  return <View style={[styles.mark, focused && styles.markOn]} />;
}

/**
 * The tabs of one member's workspace. On a phone: the purple top bar and
 * the tabs at the bottom, each a word. On a computer the side menu (in the
 * root layout) replaces both, and each page opens with its own heading,
 * centred at a comfortable reading width.
 */
export function WorkspaceTabs({ role, screens }: { role: Role; screens: TabScreen[] }) {
  const wide = useWideLayout();
  const pad = useCentredPadding(PAGE_MAX);

  return (
    <Tabs
      screenOptions={
        wide
          ? {
              headerShown: false,
              tabBarStyle: { display: 'none' },
              sceneStyle: { backgroundColor: colors.background, paddingTop: 34, paddingHorizontal: pad + spacing[4] },
            }
          : {
              headerShown: true,
              header: () => <TopBar role={role} />,
              sceneStyle: { backgroundColor: colors.background },
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textDim,
              tabBarStyle: { borderTopColor: colors.border, minHeight: 64, paddingTop: 0, backgroundColor: colors.white, elevation: 0 },
              tabBarIconStyle: { height: 10, marginBottom: 2 },
              tabBarLabelStyle: { fontSize: 12, fontFamily: 'InterTight_500Medium' },
              tabBarIcon: ({ focused }) => <TabMark focused={focused} />,
            }
      }
    >
      {screens.map((s) => (
        <Tabs.Screen key={s.name} name={s.name} options={{ title: s.title, ...(s.hidden ? { href: null } : {}) }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  top: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing[2] + 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  wordmark: { fontSize: 15, fontWeight: '600', color: colors.white },
  wordmarkDot: { color: colors.accent },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  pillText: { fontSize: 12, fontWeight: '500', color: colors.white },
  pillCount: { backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 7 },
  pillCountText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  mark: { width: 18, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: -6 },
  markOn: { backgroundColor: colors.accent },
});
