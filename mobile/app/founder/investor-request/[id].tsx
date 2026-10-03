import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useState } from 'react';
import { Header } from '../../../src/components/layout/Header';
import { Button, ConfirmModal, Input } from '../../../src/components/ui';
import { founderService } from '../../../src/services';
import { colors, spacing } from '../../../src/theme/tokens';

export default function InvestorRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['investor-requests'], queryFn: () => founderService.getInvestorRequests() });
  const item = q.data?.find((r) => r.id === id);
  const [declineReason, setDeclineReason] = useState('');
  const [modal, setModal] = useState<'approve' | 'decline' | null>(null);

  if (!item) return null;

  return (
    <>
      <Header title="Investor request" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{item.investorName}</Text>
        <Text style={styles.section}>Focus</Text>
        <Text style={styles.body}>{item.focusAreas.join(', ')}</Text>
        <Text style={styles.section}>Pitch</Text>
        <Text style={styles.body}>{item.fullPitch}</Text>
        <Text style={styles.section}>Vision</Text>
        <Text style={styles.body}>{item.vision}</Text>
        <Input label="Decline reason (optional)" value={declineReason} onChangeText={setDeclineReason} />
        <Button title="Approve" onPress={() => setModal('approve')} />
        <Button title="Decline" variant="destructive" onPress={() => setModal('decline')} />
      </ScrollView>
      <ConfirmModal
        visible={modal === 'approve'}
        title="Approve investor?"
        message={`Allow ${item.investorName} to join your project group?`}
        onCancel={() => setModal(null)}
        onConfirm={async () => {
          await founderService.respondToInvestorRequest(String(id), true);
          qc.invalidateQueries({ queryKey: ['investor-requests'] });
          setModal(null);
          router.back();
        }}
      />
      <ConfirmModal
        visible={modal === 'decline'}
        title="Decline request?"
        message="The investor will be notified."
        destructive
        onCancel={() => setModal(null)}
        onConfirm={async () => {
          await founderService.respondToInvestorRequest(String(id), false, declineReason);
          qc.invalidateQueries({ queryKey: ['investor-requests'] });
          setModal(null);
          router.back();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], gap: spacing[2] },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: { fontWeight: '600', color: colors.text, marginTop: spacing[2] },
  body: { color: colors.textMuted, lineHeight: 22 },
});
