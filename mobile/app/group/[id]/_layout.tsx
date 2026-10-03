import { Stack } from 'expo-router';

export default function GroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="deposit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="withdrawal/create" />
      <Stack.Screen name="withdrawal/[withdrawalId]" />
      <Stack.Screen name="withdrawal-approve/[withdrawalId]" />
    </Stack>
  );
}
