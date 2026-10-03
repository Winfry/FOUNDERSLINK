import { StyleSheet, Text } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { show } = useToast();
  return (
    <>
      <Header title="Delete account" onBack={() => router.back()} />
      <Text style={styles.body}>Submit a deletion request. Our team will confirm by email within 7 days.</Text>
      <Button title="Request deletion" variant="destructive" onPress={() => { show('Request submitted', 'success'); router.back(); }} style={styles.btn} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[3], color: colors.textMuted, lineHeight: 22 },
  btn: { marginHorizontal: spacing[3] },
});
