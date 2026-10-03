import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button } from '../../../../src/components/ui';
import { groupService } from '../../../../src/services';
import { formatKes } from '../../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../../src/theme/tokens';

export default function WithdrawalTrackerScreen() {
  const { id, withdrawalId } = useLocalSearchParams<{ id: string; withdrawalId: string }>();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['withdrawal', id, withdrawalId],
    queryFn: () => groupService.getWithdrawal(String(id), String(withdrawalId)),
  });

  if (!q.data) return null;
  const w = q.data;
  const approvedCount = w.approvals.filter((a) => a.status === 'approved').length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Withdrawal tracker</Text>
      <Text style={styles.amount}>{formatKes(w.amountKes)}</Text>
      <Text style={styles.reason}>{w.reason}</Text>
      {w.status === 'pending_approvals' ? (
        <>
          <Text style={styles.status}>Waiting for approvals {approvedCount} of {w.approvals.length}</Text>
          {w.approvals.map((a) => (
            <View key={a.approverId} style={styles.row}>
              <Text>{a.approverName}</Text>
              <Badge label={a.status} variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'error' : 'warning'} />
            </View>
          ))}
          <Button title="Cancel request" variant="secondary" onPress={() => router.back()} />
        </>
      ) : null}
      {w.status === 'approved' ? (
        <Button title={`Confirm withdrawal ${formatKes(w.amountKes)}`} onPress={() => router.back()} />
      ) : null}
      {w.rejectionReason ? <Text style={styles.reject}>Rejected: {w.rejectionReason}</Text> : null}
      <Button title="Open approver view (demo)" variant="ghost" onPress={() => router.push(`/group/${id}/withdrawal-approve/${withdrawalId}`)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  amount: { fontSize: 24, fontWeight: '700', color: colors.primary, marginVertical: spacing[1] },
  reason: { color: colors.textMuted, marginBottom: spacing[2] },
  status: { fontWeight: '600', marginBottom: spacing[2], color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  reject: { color: colors.error, marginTop: spacing[2] },
});
