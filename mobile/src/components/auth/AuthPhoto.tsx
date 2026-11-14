import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, radius, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

const PROMISES = [
  'Everyone you talk to has been checked by a person.',
  'Investors matched to your business, with the reasons why.',
  'FoundersLink records deals and savings. It never holds your money.',
];

/** The width of the form beside this panel (see app/_layout.tsx). */
const FORM_WIDTH = 520;

/**
 * The approved hero's purple: deep purple at the top left, through the
 * action purple, to a soft violet at the bottom right. It fills its parent.
 */
export function HeroGradient() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="0.62">
            <Stop offset="0" stopColor="#28184E" />
            <Stop offset="0.6" stopColor="#5634A5" />
            <Stop offset="1" stopColor="#765BB8" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hero)" />
      </Svg>
    </View>
  );
}

/** "FoundersLink." in white, with the gold full stop. */
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }]} accessibilityRole="header">
      FoundersLink<Text style={styles.wordmarkDot}>.</Text>
    </Text>
  );
}

/** A frosted pill on the purple, with a gold dot: "Every member is verified". */
export function HeroChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <View style={styles.dot} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

/**
 * The left half of the sign-in and sign-up pages on a computer: the
 * approved hero, in the brand's purple, with what FoundersLink promises.
 * On a wide enough window, real people beside it in an arch. Phones show
 * the form alone.
 */
export function AuthPhoto() {
  const { width } = useWindowDimensions();
  // Room for the words and the arch side by side.
  const showArch = width - FORM_WIDTH >= 820;
  return (
    <View style={styles.panel}>
      <HeroGradient />
      <View style={styles.content}>
        <Wordmark />
        <View style={styles.body}>
          <View style={styles.words}>
            <HeroChip label="Every member is verified" />
            <Text style={styles.quote}>
              <Text style={styles.quoteSoft}>Meet investors who fit. </Text>
              Close deals you can trust.
            </Text>
            <View style={styles.promises}>
              {PROMISES.map((text, i) => (
                <Text key={text} style={[styles.promise, i > 0 && styles.promiseLine]}>
                  {text}
                </Text>
              ))}
            </View>
          </View>
          {showArch ? (
            <View style={styles.arch}>
              <Image
                source={require('../../../assets/images/background-all.jpg')}
                style={styles.archImage}
                resizeMode="cover"
                accessibilityLabel="A mentor and a founder smiling at a computer"
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: colors.primaryDark, overflow: 'hidden' },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing[6] },
  wordmark: { fontWeight: '600', color: colors.white, letterSpacing: -0.4 },
  wordmarkDot: { color: colors.accent },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  chipText: { fontSize: 13, color: colors.white },
  body: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[4] },
  words: { flex: 1, gap: spacing[3], maxWidth: 520 },
  quote: { fontSize: 44, lineHeight: 48, fontWeight: '500', color: colors.white, letterSpacing: -1.2 },
  quoteSoft: { color: '#D9CCF5', fontWeight: '300' },
  promises: { maxWidth: 440 },
  promise: { fontSize: 15, color: 'rgba(255,255,255,0.8)', paddingVertical: spacing[1.5] },
  promiseLine: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  arch: {
    width: 280,
    height: 400,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  archImage: { width: '100%', height: '100%' },
});
