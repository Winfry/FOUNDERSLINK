import { useRouter } from 'expo-router';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { HandCoins, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui';
import { setWelcomeSeen } from '../src/lib/welcome-storage';
import { colors, spacing } from '../src/theme/tokens';

const PROMISES: [LucideIcon, string][] = [
  [ShieldCheck, 'Everyone you talk to has been checked.'],
  [HandCoins, 'FoundersLink never holds your money.'],
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const continueToSignup = async () => {
    await setWelcomeSeen();
    router.push('/auth/signup');
  };

  const goLogin = async () => {
    await setWelcomeSeen();
    router.push('/auth/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} bounces={false}>
      {/* The one bold thing on this screen: a photo of two people closing a
          deal, under a navy tint so the headline stays readable. */}
      <ImageBackground
        source={require('../assets/images/welcome-photo.jpg')}
        style={styles.block}
        imageStyle={styles.photo}
        resizeMode="cover"
        accessibilityLabel="Two business people shaking hands"
      >
        <View style={styles.tint} />
        <View style={[styles.blockContent, { paddingTop: insets.top + spacing[3] }]}>
          <Text style={styles.wordmark}>FoundersLink</Text>
          <Text style={styles.headline} accessibilityRole="header">
            Meet investors who fit. Close deals you can trust.
          </Text>
        </View>
      </ImageBackground>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing[3] }]}>
        <View style={styles.promises}>
          {PROMISES.map(([Icon, text]) => (
            <View key={text} style={styles.promise}>
              <View style={styles.promiseIcon}>
                <Icon size={20} color={colors.primary} />
              </View>
              <Text style={styles.promiseText}>{text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button title="Get started" onPress={() => void continueToSignup()} />
          <Button title="Log in" variant="secondary" onPress={() => void goLogin()} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.white },
  block: {
    flexGrow: 1,
    minHeight: 440,
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  photo: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  // An even navy tint over the photo, so the white text reads on it.
  tint: { ...StyleSheet.absoluteFill, backgroundColor: colors.primaryDark, opacity: 0.55 },
  blockContent: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
    justifyContent: 'space-between',
  },
  wordmark: { fontSize: 20, fontWeight: '800', color: colors.white },
  headline: { fontSize: 32, fontWeight: '800', color: colors.white },
  bottom: { paddingHorizontal: spacing[3], paddingTop: spacing[3] },
  promises: { gap: spacing[1.5] },
  promise: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  promiseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  actions: { gap: spacing[1.5], marginTop: spacing[4] },
});
