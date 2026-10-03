import { Tabs, useLocalSearchParams } from 'expo-router';
import { Header } from '../../../../src/components/layout/Header';
import { colors } from '../../../../src/theme/tokens';

export default function GroupTabsLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Header title="Project group" subtitle={String(id)} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
        <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
        <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
        <Tabs.Screen name="members" options={{ title: 'Members' }} />
        <Tabs.Screen name="documents" options={{ title: 'Docs' }} />
      </Tabs>
    </>
  );
}
