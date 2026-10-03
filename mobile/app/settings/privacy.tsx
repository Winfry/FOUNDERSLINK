import { ScrollView, StyleSheet, Text } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Privacy policy" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>Data processing under the Kenya Data Protection Act, 2019. Mock copy for frontend demo.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing[3] }, body: { color: colors.textMuted, lineHeight: 22 } });
