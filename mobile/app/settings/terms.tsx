import { ScrollView, StyleSheet, Text } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Terms of service" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>FounderLink platform terms for Kenyan founders and vetted investors. Mock copy for frontend demo.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing[3] }, body: { color: colors.textMuted, lineHeight: 22 } });
