import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui';
import { HeroChip, HeroGradient, Wordmark } from '../src/components/auth/AuthPhoto';
import { setWelcomeSeen } from '../src/lib/welcome-storage';
import { colors, radius, spacing } from '../src/theme/tokens';

const PROMISES = ['Everyone you talk to has been checked.', 'FoundersLink never holds your money.'];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Remembering that the welcome was seen is a nicety: if storage is not
  // available (a private browser window), the buttons still work.
  const go = async (to: '/auth/signup' | '/auth/login') => {
    await setWelcomeSeen().catch(() => undefined);
    router.push(to);
  };
  const continueToSignup = () => go('/auth/signup');
  const goLogin = () => go('/auth/login');

  return (
    <ScrollView contentContainerStyle={styles.wrap} bounces={false}>
      {/* The approved hero: the brand's purple, one promise in a chip, the
          headline, and the one gold action. */}
      <View style={styles.hero}>
        <HeroGradient />
        <View style={[styles.heroContent, { paddingTop: insets.top + spacing[3] }]}>
          <Wordmark />
          <View style={styles.heroWords}>
            <HeroChip label="Every member is verified" />
            <Text style={styles.headline} accessibilityRole="header">
              <Text style={styles.headlineSoft}>Meet investors who fit. </Text>
              Close deals you can trust.
            </Text>
            <Text style={styles.sub}>No cold pitches. No strangers. Only people who fit, and a clear path to a closed deal.</Text>
            <Button title="Get started" variant="gold" style={styles.heroButton} onPress={() => void continueToSignup()} />
          </View>
          <View style={styles.arch}>
            <Image
              source={require('../assets/images/welcome-photo.jpg')}
              style={styles.archImage}
              resizeMode="cover"
              accessibilityLabel="Two business people shaking hands"
            />
          </View>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing[3] }]}>
        <View style={styles.promises}>
          {PROMISES.map((text, i) => (
            <Text key={text} style={[styles.promise, i > 0 && styles.promiseLine]}>
              {text}
            </Text>
          ))}
        </View>
        <View style={styles.actions}>
          <Text style={styles.already}>Already a member?</Text>
          <Button title="Log in" variant="secondary" onPress={() => void goLogin()} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroContent: { paddingHorizontal: spacing[3], paddingBottom: spacing[4], gap: spacing[4] },
  heroWords: { gap: spacing[2] },
  headline: { fontSize: 38, lineHeight: 40, fontWeight: '500', color: colors.white, letterSpacing: -1.1 },
  headlineSoft: { color: '#D9CCF5', fontWeight: '300' },
  sub: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  heroButton: { alignSelf: 'flex-start', marginTop: spacing[1] },
  // The photo in an arch, as in the approved hero.
  arch: {
    height: 240,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    overflow: 'hidden',
  },
  archImage: { width: '100%', height: '100%' },
  bottom: { flexGrow: 1, paddingHorizontal: spacing[3], paddingTop: spacing[3], justifyContent: 'space-between' },
  promises: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing[2],
  },
  promise: { fontSize: 15, color: colors.text, paddingVertical: spacing[1.5] },
  promiseLine: { borderTopWidth: 1, borderTopColor: colors.border },
  actions: { gap: spacing[1], marginTop: spacing[3] },
  already: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
