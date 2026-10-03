import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Badge, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { groupService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function FounderGroupsTab() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['groups'], queryFn: () => groupService.listGroups() });

  if (q.isLoading) return <ScreenLoading />;
  if (!q.data?.length) return <ScreenEmpty title="No groups yet" description="Groups appear after you approve investors." />;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={q.data}
      keyExtractor={(g) => g.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/group/${item.id}/(tabs)/overview`)}>
          <Card>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{formatKes(item.balanceKes)} · {item.memberCount} members</Text>
            {item.unreadChatCount > 0 ? <Badge label={`${item.unreadChatCount} unread`} variant="warning" /> : null}
            {item.lastMessagePreview ? <Text style={styles.preview}>{item.lastMessagePreview}</Text> : null}
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[6], gap: spacing[2] },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted, marginVertical: 4 },
  preview: { fontSize: 13, color: colors.textMuted },
});
