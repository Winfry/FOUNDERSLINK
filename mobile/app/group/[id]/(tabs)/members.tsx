import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Button, ConfirmModal } from '../../../../src/components/ui';
import { useState } from 'react';
import { groupService } from '../../../../src/services';
import { formatKes } from '../../../../src/services/mocks/kenya-data';
import { useAuthStore } from '../../../../src/stores/authStore';
import { colors, spacing } from '../../../../src/theme/tokens';

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['group-members', id], queryFn: () => groupService.getMembers(String(id)) });

  return (
    <>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.name} />
            <View style={styles.meta}>
              <Text style={styles.name}>{item.name}</Text>
              <Badge label={item.role} variant={item.role === 'founder' ? 'default' : 'muted'} />
              <Text style={styles.sub}>{formatKes(item.contributionKes)} · Joined {item.joinedAt}</Text>
            </View>
            {user?.role === 'founder' && item.role !== 'founder' ? (
              <Button title="Remove" variant="destructive" onPress={() => setRemoveId(item.id)} />
            ) : null}
          </View>
        )}
      />
      <ConfirmModal
        visible={!!removeId}
        title="Remove member?"
        message="They will lose access to group finance and chat."
        destructive
        onCancel={() => setRemoveId(null)}
        onConfirm={async () => {
          if (removeId) await groupService.removeMember(String(id), removeId);
          setRemoveId(null);
          qc.invalidateQueries({ queryKey: ['group-members', id] });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[2], alignItems: 'center', marginBottom: spacing[2], paddingBottom: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  meta: { flex: 1, gap: 4 },
  name: { fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
});
