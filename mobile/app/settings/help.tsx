import { ScrollView, StyleSheet, Text } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function HelpScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Help & FAQ" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.q}>How do I verify BRS documents?</Text>
        <Text style={styles.a}>Upload PDFs in onboarding. Admin reviewers verify within 3–5 days.</Text>
        <Text style={styles.q}>How do M-Pesa deposits work?</Text>
        <Text style={styles.a}>Use the group Paybill reference shown in Finance → Deposit.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], gap: spacing[2] },
  q: { fontWeight: '700', color: colors.text },
  a: { color: colors.textMuted, lineHeight: 22, marginBottom: spacing[2] },
});
