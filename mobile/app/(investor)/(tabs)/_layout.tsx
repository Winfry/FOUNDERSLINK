import { Tabs, useRouter } from 'expo-router';
import { Bell, CircleUserRound, Compass, HandCoins, Send } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
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
      onPress={() => router.push('/(investor)/(tabs)/notifications')}
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
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.white }}>FoundersLink</Text>
    </View>
  );
}

export default function InvestorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerLeft: () => <Brand />,
        headerRight: () => <NotificationBell />,
        headerStyle: { backgroundColor: colors.primaryDark },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.white, paddingTop: 12 },
        // The tab she is on is orange: icon and label.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, minHeight: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: ({ color, focused }) => <Compass color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests', tabBarIcon: ({ color, focused }) => <Send color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="groups" options={{ title: 'Chamas', tabBarIcon: ({ color, focused }) => <HandCoins color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <CircleUserRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      {/* Reached from the bell, as on the founder's side. */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
