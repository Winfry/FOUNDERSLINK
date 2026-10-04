import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Header } from '../../src/components/layout/Header';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';

export default function LanguageScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  return (
    <>
      <Header title="Language" onBack={() => router.back()} />
      <View style={styles.content}>
        {(['en', 'sw'] as const).map((code) => (
          <Pressable key={code} style={styles.row} onPress={() => setLang(code)}>
            <Text style={styles.label}>{code === 'en' ? 'English' : 'Swahili'}</Text>
            {lang === code ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 16, color: colors.text },
  check: { color: colors.primary, fontWeight: '700' },
});
