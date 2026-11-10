import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Header } from '../src/components/layout/Header';
import { Sidebar } from '../src/components/layout/Sidebar';
import { AuthPhoto } from '../src/components/auth/AuthPhoto';
import { useCentredPadding, useWideLayout } from '../src/hooks/useWideLayout';
import { AppProviders } from '../src/providers/AppProviders';
import { useLiveUpdates } from '../src/hooks/useLiveUpdates';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/theme/tokens';

function SessionGuard() {
  const checkTokenExpiry = useAuthStore((s) => s.checkTokenExpiry);
  const router = useRouter();
  useLiveUpdates();

  // Where she is, as folder names: ['(founder)', '(tabs)', 'matches'].
  const segments = useSegments() as string[];
  const hydrated = useAuthStore((s) => s.hydrated);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const area = segments[0];

  useEffect(() => {
    if (!hydrated) return;
    const open = area === undefined || area === 'auth' || area === 'welcome' || area === 'splash';

    // Signed out, by her own press, an ended session, or a link opened
    // cold: every screen but the opening ones leads to the login screen.
    if (role === null) {
      if (!open) router.replace('/auth/login');
      return;
    }

    // Each role has its own workspace. Two of them share an address
    // ("/profile", "/notifications"), and a notification or a shared
    // screen can point at another role's, so anyone who lands on the
    // wrong side is sent to her own home. Verification is shared.
    const verify = area === 'founder' && segments[1] === 'verify';
    const foundersOnly = (area === '(founder)' || area === 'founder') && !verify;
    const investorsOnly = area === '(investor)' || area === 'investor';
    const expertsOnly = area === '(expert)' || area === 'expert';
    const home = {
      founder: '/(founder)/(tabs)/home',
      investor: '/(investor)/(tabs)/overview',
      expert: '/(expert)/(tabs)/sessions',
    } as const;
    if (role !== 'founder' && foundersOnly && role in home) router.replace(home[role as keyof typeof home] as never);
    if (role !== 'investor' && investorsOnly && role in home) router.replace(home[role as keyof typeof home] as never);
    if (role !== 'expert' && expertsOnly && role in home) router.replace(home[role as keyof typeof home] as never);
  }, [hydrated, role, area, segments, router]);

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
// nobody is left on a screen with no way out. It is the same Header the
// settings and setup screens use, so every header in the app looks alike.
function BackHeader({ title }: { title: string }) {
  const router = useRouter();
  // After a reload or a link there is nothing to go back to, so it goes home.
  // On a computer, the title lines up with the page, centred beside the side menu.
  const inset = useCentredPadding(DETAIL_MAX);
  return <Header title={title} insetX={inset || undefined} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}

const withBack = (title: string) => ({
  headerShown: true,
  header: () => <BackHeader title={title} />,
});

/** The widest a page opened from a workspace (a deal, a chat, settings) gets on a computer. */
const DETAIL_MAX = 820;

const OPEN_AREAS = new Set([undefined, 'auth', 'welcome', 'splash']);

function Screens({ wide }: { wide: boolean }) {
  const inset = useCentredPadding(DETAIL_MAX);
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        // Workspaces ("(founder)", ...) lay themselves out; pages opened
        // from them are centred at a reading width on a computer.
        contentStyle:
          wide && !route.name.startsWith('(')
            ? { backgroundColor: colors.background, paddingHorizontal: inset }
            : { backgroundColor: wide ? colors.background : colors.white },
      })}
    >
      <Stack.Screen name="founder/investor-match/[id]" options={withBack('Investor')} />
      <Stack.Screen name="founder/verify/status" options={withBack('Verification')} />
      <Stack.Screen name="deal/[id]" options={withBack('Deal')} />
      <Stack.Screen name="chama/[id]" options={withBack('Chama')} />
      <Stack.Screen name="conversations/index" options={withBack('Messages')} />
      <Stack.Screen name="conversations/[id]" options={withBack('Chat')} />
    </Stack>
  );
}

/**
 * Signed in on a computer: the side menu, and the workspace beside it.
 * Otherwise (a phone, or the welcome and login screens) the app is a
 * phone-width column, centred on a wide window.
 */
function Shell() {
  const wide = useWideLayout();
  const signedIn = useAuthStore((s) => s.user !== null);
  const area = (useSegments() as string[])[0];
  if (wide && signedIn && !OPEN_AREAS.has(area)) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
        <Sidebar />
        <View style={{ flex: 1 }}>
          <Screens wide />
        </View>
      </View>
    );
  }
  // Signing in or up on a computer: real people on the left, the form on the right.
  if (wide && area === 'auth') {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.white }}>
        <AuthPhoto />
        <View style={{ width: 520, backgroundColor: colors.white, paddingHorizontal: 20 }}>
          <Screens wide={false} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.grey100 }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: colors.white }}>
        <Screens wide={false} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <SessionGuard />
          <Shell />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
