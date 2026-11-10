import type { ComponentType } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import { useCentredPadding, useWideLayout } from '../../hooks/useWideLayout';
import { colors, spacing } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { HeaderPattern } from '../ui/HeaderPattern';
import { Text } from '../ui/Text';
import { WORKSPACES } from './workspace';

export interface TabScreen {
  name: string;
  title: string;
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  /** Reached from the menu, the bell or the avatar, not shown as a tab. */
  hidden?: boolean;
}

type Role = 'founder' | 'investor' | 'expert';

/** The widest a page's content gets beside the side menu. */
const PAGE_MAX = 1040;

function NotificationBell({ role, onDark }: { role: Role; onDark: boolean }) {
  const router = useRouter();
  // Asked again every few seconds, so a new notice lights the bell without a reload.
  const q = useQuery({ queryKey: ['notifications-badge'], queryFn: () => notificationService.list(), refetchInterval: 10000 });
  const unread = q.data?.unreadCount ?? 0;
  return (
    <Pressable
      onPress={() => router.push(WORKSPACES[role].notifications as never)}
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      style={[styles.iconButton, !onDark && styles.iconButtonLight]}
    >
      <Bell color={onDark ? colors.white : colors.primary} size={20} />
      {unread > 0 ? <View style={[styles.unread, { borderColor: onDark ? colors.primaryDark : colors.white }]} /> : null}
    </Pressable>
  );
}

function Me({ role }: { role: Role }) {
  const router = useRouter();
  const name = useAuthStore((s) => s.user?.fullName ?? '');
  return (
    <Pressable
      onPress={() => router.navigate(WORKSPACES[role].profile as never)}
      accessibilityRole="link"
      accessibilityLabel="Your profile"
      style={styles.me}
    >
      <Avatar name={name || 'Me'} size={34} />
    </Pressable>
  );
}

// On a phone: the brand in the deep purple top bar.
function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.mark}>
        <Image source={require('../../../assets/images/logo-mark.png')} style={{ width: 22, height: 19 }} resizeMode="contain" />
      </View>
      <Text style={styles.brandName}>FoundersLink</Text>
    </View>
  );
}

// On a computer: a light bar over the page, as in the design prototype.
function TopBar({ role, title }: { role: Role; title: string }) {
  const pad = useCentredPadding(PAGE_MAX);
  return (
    <View style={[styles.top, { paddingHorizontal: pad + spacing[3] }]}>
      <Text style={styles.crumb}>
        {WORKSPACES[role].name} <Text style={styles.crumbSep}>/</Text> <Text style={styles.crumbHere}>{title}</Text>
      </Text>
      <View style={styles.topRight}>
        <NotificationBell role={role} onDark={false} />
        <Me role={role} />
      </View>
    </View>
  );
}

/**
 * The tabs of one member's workspace. On a phone: the purple top bar and
 * the tabs at the bottom. On a computer the side menu (in the root layout)
 * replaces the tabs, the top bar turns light and shows where you are, and
 * pages are centred at a comfortable reading width.
 */
export function WorkspaceTabs({ role, screens }: { role: Role; screens: TabScreen[] }) {
  const wide = useWideLayout();
  const pad = useCentredPadding(PAGE_MAX);

  return (
    <Tabs
      screenOptions={({ route }) => {
        const screen = screens.find((s) => s.name === route.name);
        return wide
          ? {
              header: () => <TopBar role={role} title={screen?.title ?? ''} />,
              tabBarStyle: { display: 'none' },
              sceneStyle: { backgroundColor: colors.background, paddingTop: spacing[1], paddingHorizontal: pad + spacing[1] },
            }
          : {
              headerShown: true,
              headerTitle: '',
              headerLeft: () => <Brand />,
              headerRight: () => (
                <View style={styles.phoneRight}>
                  <NotificationBell role={role} onDark />
                  <Me role={role} />
                </View>
              ),
              headerStyle: { backgroundColor: colors.primaryDark },
              headerBackground: () => <HeaderPattern />,
              headerShadowVisible: false,
              // Every tab sits on the faint lavender page, under white cards.
              sceneStyle: { backgroundColor: colors.background, paddingTop: spacing[1] },
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarStyle: { borderTopColor: colors.border, minHeight: 64, paddingTop: 6, backgroundColor: colors.white },
              tabBarLabelStyle: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
            };
      }}
    >
      {screens.map((s) => {
        const Icon = s.icon;
        return (
          <Tabs.Screen
            key={s.name}
            name={s.name}
            options={{
              title: s.title,
              ...(s.hidden ? { href: null } : {}),
              ...(Icon
                ? { tabBarIcon: ({ color, focused }: { color: unknown; focused: boolean }) => <Icon color={color as string} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }
                : {}),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 16 },
  mark: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 17, fontWeight: '800', color: colors.white },
  phoneRight: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconButtonLight: { minWidth: 40, minHeight: 40, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  unread: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: colors.accent },
  me: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  top: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  crumb: { fontSize: 14, color: colors.textMuted },
  crumbSep: { color: colors.grey300 },
  crumbHere: { fontWeight: '700', color: colors.text },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
});
