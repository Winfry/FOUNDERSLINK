import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from '../../../../src/components/ui';
import { ScreenLoading } from '../../../../src/components/layout/ScreenStates';
import { groupService } from '../../../../src/services';
import { formatKes } from '../../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../../src/theme/tokens';

export default function GroupOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['group', id], queryFn: () => groupService.getGroup(String(id)) });
  if (q.isLoading || !q.data) return <ScreenLoading rows={2} />;
  const g = q.data;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{g.name}</Text>
        <Text style={styles.line}>Pooled: {formatKes(g.balanceKes)} / {formatKes(g.targetKes)}</Text>
        <Text style={styles.line}>{g.memberCount} members</Text>
      </Card>
      <Text style={styles.section}>Recent activity</Text>
      {g.recentActivity.map((a) => (
        <Text key={a} style={styles.activity}>• {a}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[2] },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  line: { color: colors.text, marginTop: 4 },
  section: { fontWeight: '600', marginTop: spacing[3], marginBottom: spacing[1], color: colors.text },
  activity: { color: colors.textMuted, lineHeight: 22 },
});
