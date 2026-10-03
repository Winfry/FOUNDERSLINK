import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme/tokens';

export default function ApplicationConfirmationScreen() {
  const { ref: reference } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Application received</Text>
      <Text style={styles.body}>You&apos;ll hear from us by email. Expected review: 5–10 business days.</Text>
      <Text style={styles.ref}>Reference: {reference}</Text>
      <Button title="Back to welcome" onPress={() => router.replace('/welcome')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing[4], justifyContent: 'center', gap: spacing[2], backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { color: colors.textMuted, lineHeight: 22 },
  ref: { fontSize: 16, fontWeight: '600', color: colors.primaryDark, marginVertical: spacing[2] },
});
