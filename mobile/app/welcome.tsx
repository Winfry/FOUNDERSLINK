import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/ui';
import { colors, spacing } from '../src/theme/tokens';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Welcome to FounderLink</Text>
      <Text style={styles.subtitle}>
        Founders and investors apply, get vetted, then access matching, groups, and finance tools.
      </Text>
      <View style={styles.actions}>
        <Button title="Founder? Apply to join" onPress={() => router.push('/founder-application')} />
        <Button title="Investor? Apply to join" variant="secondary" onPress={() => router.push('/investor-application')} />
        <Button title="Log in" variant="ghost" onPress={() => router.push('/auth/login')} />
        <Button title="Check founder application status" variant="ghost" onPress={() => router.push('/founder-application/status')} />
        <Button title="Check investor application status" variant="ghost" onPress={() => router.push('/investor-application/status')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: spacing[3], justifyContent: 'center', backgroundColor: colors.white },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing[2] },
  subtitle: { fontSize: 16, color: colors.textMuted, lineHeight: 24, marginBottom: spacing[4] },
  actions: { gap: spacing[2] },
});
