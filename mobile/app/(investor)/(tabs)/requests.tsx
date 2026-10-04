import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button, Card, ConfirmModal } from '../../../src/components/ui';
import { ScreenEmpty, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { useState } from 'react';
import { investorService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function InvestorRequestsTab() {
  const q = useQuery({ queryKey: ['join-requests'], queryFn: () => investorService.getJoinRequests() });
  const qc = useQueryClient();
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  if (q.isLoading) return <ScreenLoading />;
  if (!q.data?.length) return <ScreenEmpty title="No requests" description="Submit a join request from Discover." />;

  return (
    <>
      <FlatList
        contentContainerStyle={styles.list}
        data={q.data}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.founderBusinessName}</Text>
            <Text style={styles.meta}>{formatKes(item.proposedAmountKes)}</Text>
            <Badge label={item.status} variant={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'error'} />
            {item.status === 'pending' ? (
              <Button title="Withdraw request" variant="ghost" onPress={() => setWithdrawId(item.id)} />
            ) : null}
          </Card>
        )}
      />
      <ConfirmModal
        visible={!!withdrawId}
        title="Withdraw request?"
        message="You can submit a new request later."
        onCancel={() => setWithdrawId(null)}
        onConfirm={async () => {
          if (withdrawId) await investorService.withdrawJoinRequest(withdrawId);
          setWithdrawId(null);
          qc.invalidateQueries({ queryKey: ['join-requests'] });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[6] },
  card: { marginBottom: spacing[2], gap: spacing[1] },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted },
});
