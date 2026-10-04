import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ScreenLoading } from '../../src/components/layout/ScreenStates';
import { circleService } from '../../src/services';
import { formatKes } from '../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../src/theme/tokens';

export default function ChamaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['chama', id], queryFn: () => circleService.get(String(id)) });

  if (q.isLoading || !q.data) return <ScreenLoading />;

  const c = q.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{c.name}</Text>
      <Text style={styles.disclaimer}>{c.moneyDisclaimer}</Text>
      {c.paybillNumber ? <Text style={styles.body}>Paybill: {c.paybillNumber}</Text> : null}
      <Text style={styles.section}>Contributions</Text>
      {c.contributions.map((x) => (
        <Text key={x.id} style={styles.body}>{x.memberName}: {formatKes(x.amountKes)} {x.reference ? `· ${x.reference}` : ''}</Text>
      ))}
      <Text style={styles.section}>Who owes</Text>
      {c.owes.map((o) => (
        <Text key={o.memberName} style={styles.body}>{o.memberName}: {formatKes(o.amountKes)}</Text>
      ))}
      <Text style={styles.section}>Members</Text>
      {c.members.map((m) => (
        <Text key={m.userId} style={styles.body}>{m.name} · {m.role}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], backgroundColor: colors.white, gap: 6 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  disclaimer: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing[2] },
  section: { fontWeight: '700', marginTop: spacing[2], color: colors.text },
  body: { color: colors.text, lineHeight: 20 },
});
