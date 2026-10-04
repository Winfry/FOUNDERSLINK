import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '../src/providers/AppProviders';
import { useLiveUpdates } from '../src/hooks/useLiveUpdates';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/theme/tokens';

function SessionGuard() {
  const checkTokenExpiry = useAuthStore((s) => s.checkTokenExpiry);
  const router = useRouter();
  useLiveUpdates();
  useEffect(() => {
    const id = setInterval(async () => {
      const expired = await checkTokenExpiry();
      if (expired) router.replace('/welcome');
    }, 30_000);
    return () => clearInterval(id);
  }, [checkTokenExpiry, router]);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <SessionGuard />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.white },
            }}
          />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
