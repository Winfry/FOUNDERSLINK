import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/layout/Header';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  return (
    <>
      <Header title="Security" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Before withdrawals & finance</Text>
        <View style={styles.row}><Text>Biometric / PIN re-auth</Text><Switch value trackColor={{ true: colors.primary }} /></View>
        <View style={styles.row}><Text>Auto-lock after inactivity</Text><Switch value trackColor={{ true: colors.primary }} /></View>
        <View style={styles.row}><Text>Hide sensitive data in app switcher</Text><Switch value trackColor={{ true: colors.primary }} /></View>
        <Text style={styles.hint}>Account numbers are masked in finance views.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3] },
  section: { fontWeight: '600', marginBottom: spacing[2], color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  hint: { marginTop: spacing[3], color: colors.textMuted, fontSize: 13 },
});
