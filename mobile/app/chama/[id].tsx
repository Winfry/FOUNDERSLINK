import { useState } from 'react';
import { KeyboardScroll } from '../../src/components/ui/KeyboardScroll';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
import { Info } from 'lucide-react-native';
import { Text } from '../../src/components/ui/Text';
import { Avatar, Badge, Button, Card, Input, useToast } from '../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { ROLE_LABEL, Row, Section, TYPE_LABEL, ksh, shortDate } from '../../src/components/chama/parts';
import { circleService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, radius, spacing } from '../../src/theme/tokens';
import type { ApiError } from '../../src/types';

export default function ChamaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id);
  const q = useQuery({ queryKey: ['chama', id], queryFn: () => circleService.get(String(id)) });

  const [recording, setRecording] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');
  const amountKes = Number(amount);

  const record = useMutation({
    mutationFn: () =>
      circleService.recordContribution(String(id), { memberUserId, amountKes, mpesaReceipt: receipt.trim() || undefined }),
    onSuccess: (saved) => {
      toast.show(`Recorded ${ksh(saved.amountKes)}${saved.memberName ? ` from ${saved.memberName}` : ''}`, 'success');
      setAmount('');
      setReceipt('');
      setRecording(false);
      queryClient.invalidateQueries({ queryKey: ['chama', id] });
    },
  });
  // When the backend names the field it refused, its own words go at that field.
  const refused = record.error as ApiError | null;
  const receiptError = refused?.details?.find((d) => /receipt/i.test(d.path))?.message;
  const recordError = receiptError ? undefined : (refused?.details?.[0]?.message ?? refused?.message);

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError || !q.data) {
    const e = q.error as ApiError | null;
    return <ScreenError message={e?.message ?? 'Chama not found.'} code={e?.code} onRetry={() => q.refetch()} />;
  }

  const c = q.data;
  const isMoney = c.type === 'money';
  // The backend lets only the organiser or treasurer record. When the
  // role is not known the form is shown and the backend decides.
  const canRecord = isMoney && c.myRole !== 'member';
  const total = c.contributions.reduce((sum, x) => sum + x.amountKes, 0);

  const openForm = () => {
    record.reset();
    // With one member there is nobody else it could be.
    if (!memberUserId && c.members.length === 1) setMemberUserId(c.members[0].userId);
    setRecording(true);
  };

  return (
    <KeyboardScroll style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Text style={styles.title}>{c.name}</Text>
        <View style={styles.badges}>
          <Badge label={TYPE_LABEL[c.type]} variant={isMoney ? 'default' : 'muted'} />
          {c.myRole ? <Badge label={`You: ${ROLE_LABEL[c.myRole]}`} variant="muted" /> : null}
        </View>
      </View>

      {isMoney ? (
        <View style={styles.block}>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Total contributed</Text>
            <Text style={styles.heroNumber}>{ksh(total)}</Text>
            <Text style={styles.heroSub}>
              {c.contributions.length === 0
                ? 'Nothing recorded yet'
                : `From ${c.contributions.length} ${c.contributions.length === 1 ? 'contribution' : 'contributions'}`}
            </Text>
            {c.paybillNumber ? (
              <View style={styles.paybill}>
                <Text style={styles.paybillLabel}>The chama's own Paybill or Till</Text>
                <Text style={styles.paybillValue}>{c.paybillNumber}</Text>
              </View>
            ) : null}
          </View>
          {c.moneyDisclaimer ? (
            <View style={styles.notice}>
              <Info size={16} color={colors.textMuted} style={styles.noticeIcon} />
              <Text style={styles.noticeText}>{c.moneyDisclaimer}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {canRecord ? (
        recording ? (
          <Card style={styles.form}>
            <Text style={styles.formTitle}>Record a contribution</Text>
            <Text style={styles.muted}>Write down a payment a member has already made to the chama's own account.</Text>
            <View style={styles.field}>
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
                    <Text style={[styles.chipText, memberUserId === m.userId && styles.chipTextOn]}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Input
              label="Amount (KSh)"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="e.g. 2500"
            />
            <Input
              label="M-Pesa receipt (optional)"
              value={receipt}
              onChangeText={(t) => {
                setReceipt(t);
                if (record.isError) record.reset();
              }}
              error={receiptError ? `${receiptError}. Use the 8 to 12 letters and numbers on the M-Pesa message, or leave it empty.` : undefined}
              autoCapitalize="characters"
              placeholder="e.g. SJ45KQ2L9X"
              hint="8 to 12 letters and numbers, as on the M-Pesa message."
            />
            {recordError ? <Text style={styles.error}>{recordError}</Text> : null}
            <Button
              title={amountKes > 0 ? `Record ${ksh(amountKes)}` : 'Record contribution'}
              loading={record.isPending}
              disabled={!memberUserId || !(amountKes > 0)}
              onPress={() => record.mutate()}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => {
                setRecording(false);
                record.reset();
              }}
            />
          </Card>
        ) : (
          <Button title="Record a contribution" variant="secondary" onPress={openForm} />
        )
      ) : null}

      {isMoney ? (
        <Section title="Contributions" count={c.contributions.length || undefined}>
          {c.contributions.length === 0 ? (
            <Text style={styles.emptyRow}>
              {canRecord
                ? 'None recorded yet. When a member pays into the chama\'s account, record it here.'
                : 'None recorded yet. The organiser or treasurer records each payment.'}
            </Text>
          ) : (
            c.contributions.map((x, i) => (
              <Row
                key={x.id}
                title={x.memberName || 'A member'}
                sub={[shortDate(x.recordedAt), x.goalLabel ? `For ${x.goalLabel}` : '', x.reference ? `Receipt ${x.reference}` : '']
                  .filter(Boolean)
                  .join('\n')}
                right={<Text style={styles.amount}>{ksh(x.amountKes)}</Text>}
                last={i === c.contributions.length - 1}
              />
            ))
          )}
        </Section>
      ) : null}

      {isMoney && c.owes.length > 0 ? (
        <Section title="Who still owes" count={c.owes.length}>
          {c.owes.map((o, i) => (
            <Row
              key={o.memberName}
              left={<Avatar name={o.memberName} size={36} />}
              title={o.memberName}
              sub="This period"
              right={<Text style={styles.amount}>{ksh(o.amountKes)}</Text>}
              last={i === c.owes.length - 1}
            />
          ))}
        </Section>
      ) : null}

      {isMoney && c.goals.length > 0 ? (
        <Section title="Goals" count={c.goals.length}>
          {c.goals.map((g, i) => {
            const pct = g.targetKes > 0 ? Math.min(100, Math.round((g.recordedKes / g.targetKes) * 100)) : 0;
            return (
              <View key={g.id} style={[styles.goal, i < c.goals.length - 1 && styles.goalLine]}>
                <Text style={styles.goalTitle}>{g.label}</Text>
                <Text style={styles.muted}>
                  {ksh(g.recordedKes)} recorded{g.targetKes > 0 ? ` of ${ksh(g.targetKes)}` : ''}
                </Text>
                {g.targetKes > 0 ? (
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${pct}%` }]} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Section>
      ) : null}

      <Section title="Members" count={c.members.length}>
        {c.members.map((m, i) => (
          <Row
            key={m.userId}
            left={<Avatar name={m.name} size={36} />}
            title={m.userId === myId ? `${m.name} (you)` : m.name}
            right={
              <View style={styles.centred}>
                <Badge label={ROLE_LABEL[m.role] ?? m.role} variant={m.role === 'member' ? 'muted' : 'default'} />
              </View>
            }
            last={i === c.members.length - 1}
          />
        ))}
      </Section>
    </KeyboardScroll>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[4], gap: spacing[3] },
  head: { gap: spacing[1] },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  block: { gap: spacing[1.5] },
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.card, padding: spacing[2], gap: spacing[0.5] },
  heroLabel: { fontSize: 14, fontWeight: '600', color: colors.primaryLight },
  heroNumber: { fontSize: 32, fontWeight: '800', color: colors.white },
  heroSub: { fontSize: 14, fontWeight: '500', color: colors.primaryLight },
  paybill: {
    marginTop: spacing[1.5],
    paddingTop: spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  paybillLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.primaryLight },
  paybillValue: { fontSize: 14, fontWeight: '700', color: colors.white },
  notice: { flexDirection: 'row', gap: spacing[1] },
  noticeIcon: { marginTop: 2 },
  noticeText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textMuted },
  form: { gap: spacing[1.5] },
  formTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  field: { gap: spacing[1] },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    minHeight: 48,
    justifyContent: 'center',
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextOn: { color: colors.primaryDark },
  error: { color: colors.error, fontSize: 14, fontWeight: '500' },
  emptyRow: { fontSize: 14, fontWeight: '500', color: colors.textMuted, paddingVertical: spacing[2] },
  centred: { alignSelf: 'center' },
  amount: { fontSize: 16, fontWeight: '700', color: colors.text },
  goal: { paddingVertical: spacing[1.5], gap: spacing[0.5] },
  goalLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  goalTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.primaryLight, overflow: 'hidden', marginTop: spacing[0.5] },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
});
