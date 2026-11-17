import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getWelcomeSeen } from '../src/lib/welcome-storage';
import { useAuthStore } from '../src/stores/authStore';
import { LogoScreen } from '../src/components/auth/LogoScreen';

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

  // The logo, as the phone's own start-up screen shows it, until Welcome or Log in.
  return <LogoScreen />;
}
