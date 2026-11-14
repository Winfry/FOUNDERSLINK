import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Avatar, Button, Card, Input, useToast } from '../../src/components/ui';
import { Tag, kes } from '../../src/components/overview/parts';
import { ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { ROLE_LABEL, TYPE_LABEL, ksh, shortDate } from '../../src/components/chama/parts';
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
  const recordError = (record.error as ApiError | null)?.message;

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
  // What the chama is saving towards: the goals' targets added up.
  const target = c.goals.reduce((sum, g) => sum + g.targetKes, 0);
  const pct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  const goalLine =
    c.goals.length === 1
      ? `Saving for ${c.goals[0].label}.`
      : c.goals.length > 1
        ? `Saving towards ${c.goals.length} goals: ${c.goals.map((g) => g.label).join(', ')}.`
        : c.contributions.length === 0
          ? 'Nothing recorded yet.'
          : `From ${c.contributions.length} ${c.contributions.length === 1 ? 'contribution' : 'contributions'}.`;

  // This month: a member has paid once a contribution from her is recorded since the 1st.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const paidThisMonth = new Set(
    c.contributions.filter((x) => new Date(x.recordedAt).getTime() >= monthStart).map((x) => x.memberName),
  );
  const owesOf = (name: string) => c.owes.find((o) => o.memberName === name);
  // Anyone the chama says still owes who is not in the member list, so no debt goes unseen.
  const otherOwes = c.owes.filter((o) => !c.members.some((m) => m.name === o.memberName));
  const faces = c.members.slice(0, 6);

  const openForm = () => {
    record.reset();
    // With one member there is nobody else it could be.
    if (!memberUserId && c.members.length === 1) setMemberUserId(c.members[0].userId);
    setRecording(true);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Text style={styles.name} accessibilityRole="header">
          {c.name}
        </Text>
        <Text style={styles.small}>
          {TYPE_LABEL[c.type]} · {c.members.length} {c.members.length === 1 ? 'member' : 'members'}
          {c.myRole ? ` · You are ${ROLE_LABEL[c.myRole].toLowerCase()}` : ''}
        </Text>
        {faces.length > 0 ? (
          <View style={styles.faces} accessibilityLabel={`Members: ${c.members.map((m) => m.name).join(', ')}`}>
            {faces.map((m, i) => (
              <View key={m.userId} style={i > 0 && styles.overlap}>
                <Avatar name={m.name} size={34} />
              </View>
            ))}
            {c.members.length > faces.length ? <Text style={styles.more}>+{c.members.length - faces.length}</Text> : null}
          </View>
        ) : null}
        {isMoney ? (
          <>
            <Text style={styles.money}>{kes(total)}</Text>
            <Text style={styles.small}>{target > 0 ? `saved of ${kes(target)}` : 'saved so far'}</Text>
            {target > 0 ? (
              <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
            ) : null}
            <Text style={[styles.body, target > 0 ? null : styles.topGap]}>{goalLine}</Text>
            {c.paybillNumber ? (
              <View style={styles.paybill}>
                <Text style={styles.small}>The chama's own Paybill or Till</Text>
                <Text style={styles.paybillValue}>{c.paybillNumber}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </Card>

      {isMoney ? (
        <Card style={styles.card}>
          <Text style={styles.label}>This month</Text>
          {c.members.map((m, i) => {
            const owes = owesOf(m.name);
            const paid = paidThisMonth.has(m.name);
            return (
              <View key={m.userId} style={[styles.member, i > 0 && styles.line]}>
                <Avatar name={m.name} size={36} />
                <View style={styles.flex}>
                  <Text style={styles.memberName}>
                    {m.name}
                    {m.userId === myId ? <Text style={styles.you}> (you)</Text> : null}
                  </Text>
                  <Text style={styles.small}>
                    {ROLE_LABEL[m.role] ?? m.role}
                    {owes ? ` · Owes ${kes(owes.amountKes)}` : ''}
                  </Text>
                </View>
                {/* Joined before chamas became founders-only: her payments stay on the record (TEAM_DECISIONS D14). */}
                {m.takingPart === false ? (
                  <Tag label="No longer taking part" tone="quiet" />
                ) : (
                  <Tag label={paid ? 'Paid' : 'Not yet'} tone={paid ? 'done' : 'quiet'} />
                )}
              </View>
            );
          })}
          {otherOwes.map((o) => (
            <View key={o.memberName} style={[styles.member, styles.line]}>
              <Avatar name={o.memberName} size={36} />
              <View style={styles.flex}>
                <Text style={styles.memberName}>{o.memberName}</Text>
                <Text style={styles.small}>Owes {kes(o.amountKes)} this period</Text>
              </View>
              <Tag label="Not yet" tone="quiet" />
            </View>
          ))}

          {canRecord ? (
            recording ? (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Record a contribution</Text>
                <Text style={styles.small}>Write down a payment a member has already made to the chama's own account.</Text>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Who paid</Text>
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
                  onChangeText={setReceipt}
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
              </View>
            ) : (
              <Button title="Record a contribution" onPress={openForm} style={styles.topGap} />
            )
          ) : null}
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.label}>Members</Text>
          {c.members.map((m, i) => (
            <View key={m.userId} style={[styles.member, i > 0 && styles.line]}>
              <Avatar name={m.name} size={36} />
              <Text style={[styles.memberName, styles.flex]}>
                {m.name}
                {m.userId === myId ? <Text style={styles.you}> (you)</Text> : null}
              </Text>
              <Tag
                label={m.takingPart === false ? 'No longer taking part' : (ROLE_LABEL[m.role] ?? m.role)}
                tone={m.role === 'member' || m.takingPart === false ? 'quiet' : 'todo'}
              />
            </View>
          ))}
        </Card>
      )}

      {isMoney && c.goals.length > 1 ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Goals</Text>
          {c.goals.map((g, i) => {
            const gp = g.targetKes > 0 ? Math.min(100, Math.round((g.recordedKes / g.targetKes) * 100)) : 0;
            return (
              <View key={g.id} style={[styles.goal, i > 0 && styles.line]}>
                <Text style={styles.memberName}>{g.label}</Text>
                <Text style={styles.small}>
                  {kes(g.recordedKes)} recorded{g.targetKes > 0 ? ` of ${kes(g.targetKes)}` : ''}
                </Text>
                {g.targetKes > 0 ? (
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${gp}%` }]} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {isMoney ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Contributions</Text>
          {c.contributions.length === 0 ? (
            <Text style={styles.small}>
              {canRecord
                ? "None recorded yet. When a member pays into the chama's account, record it here."
                : 'None recorded yet. The organiser or treasurer records each payment.'}
            </Text>
          ) : (
            c.contributions.map((x, i) => (
              <View key={x.id} style={[styles.member, i > 0 && styles.line]}>
                <Avatar name={x.memberName || 'A member'} size={36} />
                <View style={styles.flex}>
                  <Text style={styles.memberName}>{x.memberName || 'A member'}</Text>
                  <Text style={styles.small}>
                    {[shortDate(x.recordedAt), x.goalLabel ? `For ${x.goalLabel}` : '', x.reference ? `Receipt ${x.reference}` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text style={styles.amount}>{kes(x.amountKes)}</Text>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {isMoney ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>FoundersLink never holds the money</Text>
          <Text style={styles.small}>
            {c.moneyDisclaimer || "Members pay into the chama's own Paybill or account. FoundersLink only keeps the record."}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  flex: { flex: 1, minWidth: 0 },
  card: { gap: 6 },
  name: { fontSize: 20, fontWeight: '500', color: colors.primaryDark },
  small: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  body: { fontSize: 14, color: colors.text },
  topGap: { marginTop: spacing[1] },
  faces: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6 },
  overlap: { marginLeft: -10 },
  more: { fontSize: 13, color: colors.textMuted, marginLeft: spacing[1] },
  money: { fontSize: 34, color: colors.primaryDark, marginTop: 4 },
  track: { height: 6, borderRadius: radius.full, backgroundColor: colors.primaryBorder, overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  fill: { height: 6, borderRadius: radius.full, backgroundColor: colors.primary },
  paybill: {
    marginTop: spacing[1],
    paddingTop: spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  paybillValue: { fontSize: 15, fontWeight: '500', color: colors.text },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  memberName: { fontSize: 15, fontWeight: '500', color: colors.text },
  you: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
  amount: { fontSize: 15, fontWeight: '500', color: colors.text },
  goal: { paddingVertical: spacing[1], gap: 2 },
  form: { gap: spacing[1.5], marginTop: spacing[1.5], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border },
  formTitle: { fontSize: 16, fontWeight: '500', color: colors.primaryDark },
  field: { gap: spacing[1] },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  chip: {
    borderWidth: 1,
    borderColor: colors.primaryLine,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.text },
  chipTextOn: { color: colors.primary },
  error: { color: colors.error, fontSize: 14 },
  note: { backgroundColor: colors.primaryLight, borderRadius: radius.card, padding: spacing[2], gap: 4 },
  noteTitle: { fontSize: 15, fontWeight: '500', color: colors.primaryDark },
});
