import { Tabs, useRouter } from 'expo-router';
import { Bell, CheckSquare, Handshake, Layers, User } from 'lucide-react-native';
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
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.error,
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
        tabBarStyle: { borderTopColor: colors.border, minHeight: 56 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: ({ color, size }) => <Handshake color={color} size={size} /> }} />
      <Tabs.Screen name="readiness" options={{ title: 'Readiness', tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }} />
      <Tabs.Screen name="connections" options={{ title: 'Connections', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      <Tabs.Screen name="chamas" options={{ title: 'Chamas', tabBarIcon: ({ color, size }) => <Layers color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
