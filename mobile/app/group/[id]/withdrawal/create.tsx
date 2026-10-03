import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScreen } from '../../../../src/components/layout/AuthScreen';
import { Button, FileUploader, Input, Textarea } from '../../../../src/components/ui';
import { groupService } from '../../../../src/services';

export default function WithdrawalCreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const w = await groupService.submitWithdrawal(String(id), { amountKes: amount, reason });
      router.replace(`/group/${id}/withdrawal/${w.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Withdrawal request" onBack={() => router.back()}>
      <Input label="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
      <Textarea label="Reason" value={reason} onChangeText={setReason} />
      <FileUploader label="Supporting document (optional)" onChange={() => undefined} />
      <Button title="Submit request" loading={loading} onPress={submit} />
    </AuthScreen>
  );
}
