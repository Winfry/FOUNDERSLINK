import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui';
import { setWelcomeSeen } from '../src/lib/welcome-storage';
import { colors, spacing } from '../src/theme/tokens';

export default function WelcomeScreen() {
  const router = useRouter();

  const continueToSignup = async () => {
    await setWelcomeSeen();
    router.push('/auth/signup');
  };

  const goLogin = async () => {
    await setWelcomeSeen();
    router.push('/auth/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Image
        source={require('../assets/images/handshake.png')}
        style={styles.hero}
        resizeMode="cover"
        accessibilityLabel="Handshake closing a deal"
      />
      <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.headline}>Meet investors who fit. Close deals you can trust.</Text>
      <Text style={styles.sub}>
        Everyone you talk to has been checked. FounderLink never holds your money.
      </Text>
      <View style={styles.actions}>
        <Button title="Get started" onPress={() => void continueToSignup()} />
        <Button title="Log in" variant="secondary" onPress={() => void goLogin()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    padding: spacing[3],
    paddingBottom: spacing[6],
    backgroundColor: colors.white,
  },
  hero: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: spacing[3],
  },
  logo: {
    width: 180,
    height: 40,
    marginBottom: spacing[3],
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 38,
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  actions: { gap: spacing[2] },
});
