import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
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

  // When she is signed out, by her own press or because her session
  // ended, she goes to the login screen wherever she was.
  const signedIn = useAuthStore((s) => s.user !== null);
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (wasSignedIn.current && !signedIn) router.replace('/auth/login');
    wasSignedIn.current = signedIn;
  }, [signedIn, router]);

  useEffect(() => {
    const id = setInterval(async () => {
      const expired = await checkTokenExpiry();
      if (expired) router.replace('/welcome');
    }, 30_000);
    return () => clearInterval(id);
  }, [checkTokenExpiry, router]);
  return null;
}

// Screens opened from a tab sit on top of the tabs, so the bottom menu
// is not there. Each gets a header with a back button instead, so
// nobody is left on a screen with no way out.
function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel="Go back"
      // After a reload or a link there is nothing to go back to, so it goes home.
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}
    >
      <ChevronLeft size={24} color={colors.primaryDark} />
    </Pressable>
  );
}

const withBack = (title: string) => ({
  headerShown: true,
  title,
  headerLeft: () => <BackButton />,
  headerTitleStyle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: colors.text },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.white },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <SessionGuard />
          {/* On a wide browser window the app keeps a phone's width, centred. */}
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.grey100 }}>
            <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: colors.white }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.white },
                }}
              >
                <Stack.Screen name="founder/investor-match/[id]" options={withBack('Investor')} />
                <Stack.Screen name="founder/verify/status" options={withBack('Verification')} />
                <Stack.Screen name="deal/[id]" options={withBack('Deal')} />
                <Stack.Screen name="chama/[id]" options={withBack('Chama')} />
                <Stack.Screen name="conversations/index" options={withBack('Messages')} />
                <Stack.Screen name="conversations/[id]" options={withBack('Chat')} />
              </Stack>
            </View>
          </View>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
