import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Compass } from 'lucide-react-native';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui';
import { colors, spacing } from '../src/theme/tokens';

/** Shown for an address the app does not have, instead of the framework's own page. */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Compass size={28} color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        This page is not here
      </Text>
      <Text style={styles.body}>The link may be old, or the address may have a typing mistake.</Text>
      <Button title="Go to the start" onPress={() => router.replace('/')} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4], gap: spacing[1], backgroundColor: colors.white },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 16, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  btn: { marginTop: spacing[2], alignSelf: 'stretch' },
});
