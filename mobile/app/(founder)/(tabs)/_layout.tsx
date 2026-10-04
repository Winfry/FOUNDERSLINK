import { Tabs, useRouter } from 'expo-router';
import { Bell, CircleUserRound, ClipboardCheck, HandCoins, Handshake, UsersRound } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from '../../../src/components/ui/Text';
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
      <Bell color={colors.white} size={22} />
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
            borderColor: colors.primaryDark,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// The top bar carries the brand: navy, with the mark and the name.
function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 16 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={require('../../../assets/images/logo-mark.png')} style={{ width: 22, height: 19 }} resizeMode="contain" />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.white }}>FounderLink</Text>
    </View>
  );
}

// The tab she is on is marked by an orange bar above its icon.
function TabIcon({ focused, children }: { focused: boolean; children: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: 24, height: 3, borderRadius: 2, backgroundColor: focused ? colors.accent : 'transparent' }} />
      {children}
    </View>
  );
}

export default function FounderTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerLeft: () => <Brand />,
        headerRight: () => <NotificationBell />,
        headerStyle: { backgroundColor: colors.primaryDark },
        headerShadowVisible: false,
        // Every tab sits on white. Without this, a screen that sets no
        // background of its own shows the navigator's grey.
        sceneStyle: { backgroundColor: colors.white, paddingTop: 12 },
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, minHeight: 68, paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
      }}
    >
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Handshake color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /></TabIcon> }} />
      <Tabs.Screen name="readiness" options={{ title: 'Readiness', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><ClipboardCheck color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /></TabIcon> }} />
      <Tabs.Screen name="connections" options={{ title: 'Network', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><UsersRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /></TabIcon> }} />
      <Tabs.Screen name="chamas" options={{ title: 'Chamas', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><HandCoins color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /></TabIcon> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><CircleUserRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /></TabIcon> }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
