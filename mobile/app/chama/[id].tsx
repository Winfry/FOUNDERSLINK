import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Button, Input } from '../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { circleService } from '../../src/services';
import { formatKes } from '../../src/services/mocks/kenya-data';
import { colors, radius, spacing } from '../../src/theme/tokens';
import type { ApiError } from '../../src/types';

export default function ChamaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['chama', id], queryFn: () => circleService.get(String(id)) });

  const [memberUserId, setMemberUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');
  const amountKes = Number(amount);

  const record = useMutation({
    mutationFn: () =>
      circleService.recordContribution(String(id), { memberUserId, amountKes, mpesaReceipt: receipt.trim() || undefined }),
    onSuccess: () => {
      setAmount('');
      setReceipt('');
      queryClient.invalidateQueries({ queryKey: ['chama', id] });
    },
  });
  const recordError = (record.error as ApiError | null)?.message;

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError || !q.data) {
    return <ScreenError message={(q.error as ApiError | null)?.message ?? 'Chama not found.'} onRetry={() => q.refetch()} />;
  }

  const c = q.data;
  const isMoney = c.type === 'money';
  // The backend lets only the organiser or treasurer record. When the
  // role is not known the form is shown and the backend decides.
  const canRecord = isMoney && c.myRole !== 'member';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{c.name}</Text>
      {c.moneyDisclaimer ? <Text style={styles.disclaimer}>{c.moneyDisclaimer}</Text> : null}
      {c.paybillNumber ? <Text style={styles.body}>The circle's own Paybill or Till: {c.paybillNumber}</Text> : null}

      {isMoney ? (
        <>
          <Text style={styles.section}>Contributions</Text>
          {c.contributions.length === 0 ? <Text style={styles.muted}>None recorded yet.</Text> : null}
          {c.contributions.map((x) => (
            <Text key={x.id} style={styles.body}>
              {x.memberName}: {formatKes(x.amountKes)}
              {x.goalLabel ? ` · ${x.goalLabel}` : ''}
              {x.reference ? ` · ${x.reference}` : ''}
            </Text>
          ))}

          {canRecord ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Record a contribution</Text>
              <Text style={styles.muted}>Write down a payment a member has already made to the circle's own account.</Text>
              <Text style={styles.label}>Who paid</Text>
              <View style={styles.chips}>
                {c.members.map((m) => (
                  <Pressable
                    key={m.userId}
                    onPress={() => setMemberUserId(m.userId)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: memberUserId === m.userId }}
                    style={[styles.chip, memberUserId === m.userId && styles.chipOn]}
                  >
                    <Text style={styles.body}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Input label="Amount (KSh)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
              <Input
                label="M-Pesa receipt (optional)"
                value={receipt}
                onChangeText={setReceipt}
                autoCapitalize="characters"
                placeholder="e.g. SJ45KQ2L9X"
                hint="8 to 12 letters and numbers, as on the M-Pesa message."
              />
              {recordError ? <Text style={styles.error}>{recordError}</Text> : null}
              {record.isSuccess ? <Text style={styles.ok}>Recorded.</Text> : null}
              <Button
                title="Record contribution"
                loading={record.isPending}
                disabled={!memberUserId || !(amountKes > 0)}
                onPress={() => record.mutate()}
              />
            </View>
          ) : null}

          <Text style={styles.section}>Who owes</Text>
          {c.owes.length === 0 ? <Text style={styles.muted}>Nobody is shown as owing.</Text> : null}
          {c.owes.map((o) => (
            <Text key={o.memberName} style={styles.body}>{o.memberName}: {formatKes(o.amountKes)}</Text>
          ))}

          {c.goals.length > 0 ? <Text style={styles.section}>Goals</Text> : null}
          {c.goals.map((g) => (
            <Text key={g.id} style={styles.body}>
              {g.label}: {formatKes(g.recordedKes)} recorded{g.targetKes ? ` of ${formatKes(g.targetKes)}` : ''}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>Members</Text>
      {c.members.map((m) => (
        <Text key={m.userId} style={styles.body}>{m.name} · {m.role}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], backgroundColor: colors.white, gap: 6 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  disclaimer: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing[2] },
  section: { fontWeight: '700', marginTop: spacing[2], color: colors.text },
  body: { color: colors.text, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  form: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing[2], marginTop: spacing[2], gap: 6 },
  formTitle: { fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: spacing[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginBottom: spacing[1] },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing[2], paddingVertical: spacing[1], minHeight: 44, justifyContent: 'center' },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  error: { color: colors.error, fontSize: 14 },
  ok: { color: colors.primary, fontSize: 14 },
});
