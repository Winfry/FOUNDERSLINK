import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { circleService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

export default function ChamasScreen() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['chamas'], queryFn: () => circleService.list() });

  if (q.isLoading) return <ScreenLoading />;
  if (!q.data?.length) {
    return <ScreenEmpty title="No chamas yet" description="Join a chama by invite link from an organiser." />;
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={q.data}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/chama/${item.id}`)}>
          <Card>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.memberCount} members</Text>
            {item.paybillNumber ? <Text style={styles.meta}>Paybill: {item.paybillNumber}</Text> : null}
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], gap: spacing[2] },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
