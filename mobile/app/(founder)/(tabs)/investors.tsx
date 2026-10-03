import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { founderService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderInvestorsTab() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['investor-requests'], queryFn: () => founderService.getInvestorRequests() });

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) return <ScreenError message="Could not load requests." onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <ScreenEmpty title="No investor requests" description="When investors request to join, they appear here." />;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={q.data}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/founder/investor-request/${item.id}`)}>
          <Card style={styles.card}>
            <Text style={styles.name}>{item.investorName}</Text>
            <Text style={styles.preview} numberOfLines={2}>{item.pitchPreview}</Text>
            <Badge label={item.status} variant={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'error'} />
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[6] },
  card: { marginBottom: spacing[2] },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  preview: { color: colors.textMuted, marginVertical: spacing[1] },
});
