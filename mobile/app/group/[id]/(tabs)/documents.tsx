import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../../src/components/ui';
import { groupService } from '../../../../src/services';
import { colors, spacing } from '../../../../src/theme/tokens';

export default function GroupDocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['group-docs', id], queryFn: () => groupService.getDocuments(String(id)) });
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No documents yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Badge label={item.status} variant={item.status === 'verified' ? 'success' : 'warning'} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { flex: 1, marginRight: 8, color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[4] },
});
