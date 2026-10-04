import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const { hydrated, hydrate, user } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/splash" />;
  }

  if (user.role === 'founder') {
    if (!user.founderOnboardingComplete) {
      return <Redirect href="/founder/onboarding" />;
    }
    return <Redirect href="/(founder)/(tabs)/matches" />;
  }

  if (user.role === 'investor') {
    // An investor first says who she invests for and what she funds.
    if (!user.investorOnboardingComplete) {
      return <Redirect href="/investor/onboarding" />;
    }
    return <Redirect href="/(investor)/(tabs)/discover" />;
  }

  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
