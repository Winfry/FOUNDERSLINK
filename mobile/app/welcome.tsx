import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { HandCoins, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui';
import { setWelcomeSeen } from '../src/lib/welcome-storage';
import { colors, spacing } from '../src/theme/tokens';

const PROMISES: [LucideIcon, string][] = [
  [ShieldCheck, 'Everyone you talk to has been checked.'],
  [HandCoins, 'FounderLink never holds your money.'],
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
      {/* The one bold thing on this screen: a navy block, the mark, and a single orange shape. */}
      <View style={[styles.block, { paddingTop: insets.top + spacing[3] }]}>
        <View style={styles.orange} />
        <View style={styles.blue} />
        <Text style={styles.wordmark}>FounderLink</Text>
        <View style={styles.disc}>
          <Image
            source={require('../assets/images/logo-mark.png')}
            style={styles.mark}
            resizeMode="contain"
            accessibilityLabel="FounderLink"
          />
        </View>
        <Text style={styles.headline} accessibilityRole="header">
          Meet investors who fit. Close deals you can trust.
        </Text>
      </View>

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
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  // Two flat circles running off the right edge. Solid colours, no gradient.
  orange: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.accent,
    right: -96,
    top: 72,
  },
  blue: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
    right: 104,
    top: 232,
  },
  wordmark: { fontSize: 20, fontWeight: '800', color: colors.white },
  // The logo file has a white background, so it sits on a white disc.
  disc: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginRight: spacing[3],
    marginVertical: spacing[3],
  },
  mark: { width: 84, height: 71 },
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
