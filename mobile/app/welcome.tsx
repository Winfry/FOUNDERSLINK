import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui';
import { HeroChip, Wordmark } from '../src/components/auth/AuthPhoto';
import { setWelcomeSeen } from '../src/lib/welcome-storage';
import { colors, spacing } from '../src/theme/tokens';

const PROMISES = ['Everyone you talk to has been checked.', 'FoundersLink never holds your money.'];

/**
 * The brand's purple over the photo: deep at the top behind the headline,
 * clear in the middle where the hands meet, and deep again at the bottom
 * behind the buttons, so every word is easy to read.
 */
function PhotoShade() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#28184E" stopOpacity="0.95" />
            <Stop offset="0.3" stopColor="#28184E" stopOpacity="0.82" />
            <Stop offset="0.46" stopColor="#5634A5" stopOpacity="0.12" />
            <Stop offset="0.66" stopColor="#5634A5" stopOpacity="0.1" />
            <Stop offset="0.78" stopColor="#28184E" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#28184E" stopOpacity="0.97" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#shade)" />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // On a computer the words sit further in from the edge of the window.
  const side = useWindowDimensions().width >= 900 ? 64 : spacing[3];

  // Remembering that the welcome was seen is a nicety: if storage is not
  // available (a private browser window), the buttons still work.
  const go = async (to: '/auth/signup' | '/auth/login') => {
    await setWelcomeSeen().catch(() => undefined);
    router.push(to);
  };

  return (
    <View style={styles.wrap}>
      {/* The handshake fills the whole screen; everything else sits on it. */}
      <Image
        source={require('../assets/images/welcome-photo.jpg')}
        style={styles.photo}
        resizeMode="cover"
        accessibilityLabel="Two business people shaking hands"
      />
      <PhotoShade />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[3], paddingBottom: insets.bottom + spacing[3], paddingHorizontal: side }]}
        bounces={false}
      >
        {/* The words at the top and the buttons at the bottom, so the
            handshake shows clearly in the middle. */}
        <View style={styles.topWords}>
          <Wordmark />
          <HeroChip label="Every member is verified" />
          <Text style={styles.headline} accessibilityRole="header">
            <Text style={styles.headlineSoft}>Meet investors who fit. </Text>
            Close deals you can trust.
          </Text>
          <Text style={styles.sub}>No cold pitches. No strangers. Only people who fit, and a clear path to a closed deal.</Text>
        </View>

        <View style={styles.bottomWords}>
          <View style={styles.promises}>
            {PROMISES.map((text) => (
              <View key={text} style={styles.promise}>
                <View style={styles.dot} />
                <Text style={styles.promiseText}>{text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Button title="Get started" variant="gold" onPress={() => void go('/auth/signup')} />
            <Text style={styles.already}>Already a member?</Text>
            <Button title="Log in" variant="secondary" onPress={() => void go('/auth/login')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.primaryDark, overflow: 'hidden' },
  // Sized to the screen, not to the photo, so it covers every corner on a phone and on the web.
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: spacing[3], gap: spacing[4] },
  topWords: { gap: spacing[2], alignItems: 'flex-start', width: '100%', maxWidth: 520 },
  bottomWords: { gap: spacing[2], width: '100%', maxWidth: 520 },
  headline: { fontSize: 38, lineHeight: 40, fontWeight: '500', color: colors.white, letterSpacing: -1.1 },
  headlineSoft: { fontSize: 38, lineHeight: 40, color: '#D9CCF5', fontWeight: '300', letterSpacing: -1.1 },
  sub: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  promises: { gap: spacing[1] },
  promise: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  promiseText: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  actions: { gap: spacing[1], marginTop: spacing[1] },
  already: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: spacing[1] },
});
