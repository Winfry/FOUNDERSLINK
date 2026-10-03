import { Tabs } from 'expo-router';
import { Compass, Send, Layers, Bell, User } from 'lucide-react-native';
import { colors } from '../../../src/theme/tokens';

export default function InvestorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, minHeight: 56 },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests', tabBarIcon: ({ color, size }) => <Send color={color} size={size} /> }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: ({ color, size }) => <Layers color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
