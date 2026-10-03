import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme/tokens';

export default function FounderApplicationConfirmation() {
  const { ref: reference } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Application received</Text>
      <Text style={styles.body}>If approved, you will receive your User ID and temporary password by email.</Text>
      <Text style={styles.ref}>Reference: {reference}</Text>
      <Button title="Check status" variant="secondary" onPress={() => router.push('/founder-application/status')} />
      <Button title="Back to welcome" variant="ghost" onPress={() => router.replace('/welcome')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing[4], justifyContent: 'center', gap: spacing[2], backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { color: colors.textMuted, lineHeight: 22 },
  ref: { fontWeight: '600', color: colors.primaryDark, marginVertical: spacing[2] },
});
