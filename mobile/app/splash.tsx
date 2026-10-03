import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/intro'), 1200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>FounderLink</Text>
      <Text style={styles.tagline}>Connecting Kenyan founders with vetted investors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    marginTop: spacing[2],
    fontSize: 15,
    color: colors.primaryLight,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
