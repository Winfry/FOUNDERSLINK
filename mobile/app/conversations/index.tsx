import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { ScreenEmpty, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { conversationService } from '../../src/services';
import { colors, spacing } from '../../src/theme/tokens';

export default function ConversationsScreen() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['conversations'], queryFn: () => conversationService.list(), refetchInterval: 5000 });

  if (q.isLoading) return <ScreenLoading />;
  if (!q.data?.length) return <ScreenEmpty title="No conversations" description="Chat appears after you connect with a member." />;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={q.data}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/conversations/${item.id}`)}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.preview}>{item.lastMessagePreview}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], backgroundColor: colors.white },
  row: { paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontWeight: '700', color: colors.text },
  preview: { color: colors.textMuted, marginTop: 4 },
});
