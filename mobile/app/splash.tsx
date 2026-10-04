import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getWelcomeSeen } from '../src/lib/welcome-storage';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await hydrate();
      } catch {
        /* session restore failed — continue */
      } finally {
        if (cancelled) return;
        const sessionUser = useAuthStore.getState().user;
        setTimeout(async () => {
          if (cancelled) return;
          if (sessionUser) {
            router.replace('/');
            return;
          }
          const seen = await getWelcomeSeen();
          router.replace(seen ? '/auth/login' : '/welcome');
        }, 1500);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hydrate, router]);

  void user;

  return (
    <View style={styles.wrap}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="FounderLink" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 240,
    height: 54,
  },
});
