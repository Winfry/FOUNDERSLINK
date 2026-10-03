import { Tabs } from 'expo-router';
import { Home, Users, Layers, Bell, User } from 'lucide-react-native';
import { colors } from '../../../src/theme/tokens';

export default function FounderTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, minHeight: 56 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="investors" options={{ title: 'Investors', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: ({ color, size }) => <Layers color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
