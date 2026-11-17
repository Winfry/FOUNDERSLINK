import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/stores/authStore';
import { LogoScreen } from '../src/components/auth/LogoScreen';

export default function Index() {
  const { hydrated, hydrate, user } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // While the session is restored, the logo stays on screen: the first thing
  // anyone sees is FoundersLink, never a spinner.
  if (!hydrated) return <LogoScreen />;

  if (!user) {
    return <Redirect href="/splash" />;
  }

  if (user.role === 'founder') {
    if (!user.founderOnboardingComplete) {
      return <Redirect href="/founder/onboarding" />;
    }
    return <Redirect href={'/(founder)/(tabs)/home' as never} />;
  }

  if (user.role === 'investor') {
    // An investor first says who she invests for and what she funds.
    if (!user.investorOnboardingComplete) {
      return <Redirect href="/investor/onboarding" />;
    }
    return <Redirect href={'/(investor)/(tabs)/overview' as never} />;
  }

  if (user.role === 'expert') {
    // An expert first says what she does and how many sessions she offers.
    if (!user.expertOnboardingComplete) {
      return <Redirect href="/expert/onboarding" />;
    }
    return <Redirect href={'/(expert)/(tabs)/sessions' as never} />;
  }

  return <Redirect href="/welcome" />;
}

