import { Linking, StyleSheet, Text } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button } from '../../src/components/ui';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function SupportScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Contact support" onBack={() => router.back()} />
      <Text style={styles.body}>Email support@founderlink.co.ke or call +254 700 000 000 (Mon–Fri, 8am–6pm EAT).</Text>
      <Button title="Email support" onPress={() => Linking.openURL('mailto:support@founderlink.co.ke')} style={styles.btn} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[3], color: colors.text, lineHeight: 22 },
  btn: { marginHorizontal: spacing[3] },
});
