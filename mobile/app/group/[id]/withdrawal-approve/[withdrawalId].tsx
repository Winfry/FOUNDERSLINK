import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, ConfirmModal, Input } from '../../../../src/components/ui';
import { groupService } from '../../../../src/services';
import { formatKes } from '../../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../../src/theme/tokens';

export default function WithdrawalApproveScreen() {
  const { id, withdrawalId } = useLocalSearchParams<{ id: string; withdrawalId: string }>();
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState('');
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null);
  const q = useQuery({
    queryKey: ['withdrawal', id, withdrawalId],
    queryFn: () => groupService.getWithdrawal(String(id), String(withdrawalId)),
  });

  if (!q.data) return null;
  const w = q.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.note}>You were selected to review this request.</Text>
      <Text style={styles.line}>{w.requesterName}</Text>
      <Text style={styles.line}>{w.requesterEmail}</Text>
      <Text style={styles.amount}>{formatKes(w.amountKes)}</Text>
      <Text style={styles.line}>{w.reason}</Text>
      <Input label="Reject reason" value={rejectReason} onChangeText={setRejectReason} />
      <Button title="Approve" onPress={() => setModal('approve')} />
      <Button title="Reject" variant="destructive" onPress={() => setModal('reject')} />
      <ConfirmModal
        visible={modal === 'approve'}
        title="Approve withdrawal?"
        message={`Approve ${formatKes(w.amountKes)} for ${w.requesterName}?`}
        onCancel={() => setModal(null)}
        onConfirm={async () => {
          await groupService.approveWithdrawal(String(withdrawalId), true);
          setModal(null);
          router.back();
        }}
      />
      <ConfirmModal
        visible={modal === 'reject'}
        title="Reject withdrawal?"
        message="The requester will see your reason."
        destructive
        onCancel={() => setModal(null)}
        onConfirm={async () => {
          await groupService.approveWithdrawal(String(withdrawalId), false, rejectReason);
          setModal(null);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], gap: spacing[2] },
  note: { color: colors.primaryDark, fontWeight: '600', backgroundColor: colors.primaryLight, padding: spacing[2], borderRadius: 12 },
  line: { color: colors.text },
  amount: { fontSize: 22, fontWeight: '700', color: colors.text },
});
