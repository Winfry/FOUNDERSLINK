import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getWelcomeSeen } from '../src/lib/welcome-storage';
import { useAuthStore } from '../src/stores/authStore';
import { Text } from '../src/components/ui/Text';
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
      {/* The mark from the logo, with the name typed beside it in the logo's two blues. */}
      <View style={styles.lockup} accessibilityRole="image" accessibilityLabel="FoundersLink">
        <Image source={require('../assets/images/logo-mark.png')} style={styles.mark} resizeMode="contain" />
        <Text style={styles.name}>
          Founders<Text style={[styles.name, styles.link]}>Link</Text>
        </Text>
      </View>
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
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 64, height: 54 },
  name: { fontSize: 32, fontWeight: '800', color: colors.primaryDark },
  link: { color: colors.primary },
});
