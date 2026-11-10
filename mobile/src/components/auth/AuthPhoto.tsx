import { HandCoins, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

const PROMISES = [
  { Icon: ShieldCheck, text: 'Everyone you talk to has been checked by a person.' },
  { Icon: Sparkles, text: 'Investors matched to your business, with the reasons why.' },
  { Icon: HandCoins, text: 'FoundersLink records deals and savings. It never holds your money.' },
];

/**
 * The left half of the sign-in and sign-up pages on a computer: real
 * people working together, under the brand's purple, with what
 * FoundersLink promises. Phones show the form alone.
 */
export function AuthPhoto() {
  return (
    <View style={styles.panel}>
      <View style={styles.photo}>
        <Image
          source={require('../../../assets/images/background-all.jpg')}
          style={styles.photoImage}
          resizeMode="cover"
          accessibilityLabel="A mentor and a founder smiling at a computer"
        />
      </View>
      <View style={styles.tint} />
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Image source={require('../../../assets/images/logo-mark.png')} style={styles.markImage} resizeMode="contain" />
          </View>
          <Text style={styles.brandName}>FoundersLink</Text>
        </View>
        <View style={styles.words}>
          <Text style={styles.quote}>Meet investors who fit. Close deals you can trust.</Text>
          <View style={styles.promises}>
            {PROMISES.map(({ Icon, text }) => (
              <View key={text} style={styles.promise}>
                <View style={styles.promiseIcon}>
                  <Icon size={18} color={colors.primaryDark} />
                </View>
                <Text style={styles.promiseText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: colors.primaryDark, overflow: 'hidden' },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  photoImage: { width: '100%', height: '100%' },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primaryDark, opacity: 0.62 },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing[6] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  mark: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  markImage: { width: 30, height: 26 },
  brandName: { fontSize: 22, fontWeight: '800', color: colors.white },
  words: { gap: spacing[3], maxWidth: 520 },
  quote: { fontSize: 36, lineHeight: 44, fontWeight: '800', color: colors.white },
  promises: { gap: spacing[1.5] },
  promise: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  promiseIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  promiseText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.white },
});
