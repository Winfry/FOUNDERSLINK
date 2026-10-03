import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreen } from '../../../src/components/layout/AuthScreen';
import { Button, Input } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { groupService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';

export default function DepositScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      const tx = await groupService.deposit(String(id), Number(amount));
      show(`Deposit ${formatKes(tx.amountKes)} submitted`, 'success');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Deposit" onBack={() => router.back()}>
      <Text style={styles.hint}>Enter amount (KES). You will receive M-Pesa / bank instructions.</Text>
      <Input label="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
      <Button title="Confirm deposit" loading={loading} onPress={confirm} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({ hint: { marginBottom: 12, color: '#64748B' } });
