import { Tabs, useRouter } from 'expo-router';
import { Bell, CircleUserRound, ClipboardCheck, HandCoins, Handshake, UsersRound } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../../src/services';
import { colors } from '../../../src/theme/tokens';

function NotificationBell() {
  const router = useRouter();
  // Asked again every few seconds, so a new notice lights the bell without a reload.
  const q = useQuery({ queryKey: ['notifications-badge'], queryFn: () => notificationService.list(), refetchInterval: 10000 });
  const unread = q.data?.unreadCount ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/(founder)/(tabs)/notifications')}
      accessibilityLabel="Notifications"
      style={{ marginRight: 12, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Bell color={colors.text} size={22} />
      {unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: colors.white,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}
    </Pressable>
  );
}

export default function FounderTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerRight: () => <NotificationBell />,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, minHeight: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
      }}
    >
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: ({ color, focused }) => <Handshake color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="readiness" options={{ title: 'Readiness', tabBarIcon: ({ color, focused }) => <ClipboardCheck color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="connections" options={{ title: 'Network', tabBarIcon: ({ color, focused }) => <UsersRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="chamas" options={{ title: 'Chamas', tabBarIcon: ({ color, focused }) => <HandCoins color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <CircleUserRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
