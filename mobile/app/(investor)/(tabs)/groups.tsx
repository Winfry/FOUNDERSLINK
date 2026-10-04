import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { circleService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function InvestorGroupsTab() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['groups'], queryFn: () => circleService.list() });

  if (q.isLoading) return <ScreenLoading />;
  if (!q.data?.length) return <ScreenEmpty title="No groups" description="Joined groups appear after founder approval." />;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={q.data}
      keyExtractor={(g) => g.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/chama/${item.id}`)}>
          <Card>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.memberCount} members</Text>
            {item.unreadChatCount > 0 ? <Badge label={`${item.unreadChatCount} unread messages`} variant="warning" /> : null}
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[6] },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginVertical: 4 },
});
