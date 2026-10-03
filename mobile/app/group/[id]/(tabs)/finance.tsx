import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card } from '../../../../src/components/ui';
import { ScreenLoading } from '../../../../src/components/layout/ScreenStates';
import { groupService } from '../../../../src/services';
import { ABSA_DEPOSIT_DETAILS, formatKes } from '../../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../../src/theme/tokens';

export default function GroupFinanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['group-finance', id],
    queryFn: async () => {
      const [group, tx] = await Promise.all([
        groupService.getGroup(String(id)),
        groupService.getTransactions(String(id)),
      ]);
      return { group, tx };
    },
  });

  if (q.isLoading || !q.data) return <ScreenLoading rows={2} />;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      contentContainerStyle={styles.content}
    >
      <Card>
        <Text style={styles.balanceLabel}>Group balance</Text>
        <Text style={styles.balance}>{formatKes(q.data.group.balanceKes)}</Text>
        <Button title="Deposit" onPress={() => router.push(`/group/${id}/deposit`)} />
        <Button title="Request withdrawal" variant="secondary" onPress={() => router.push(`/group/${id}/withdrawal/create`)} style={styles.mt} />
      </Card>
      <Text style={styles.section}>Absa deposit details</Text>
      <Card>
        <Text style={styles.meta}>{ABSA_DEPOSIT_DETAILS.bankName}</Text>
        <Text style={styles.meta}>{ABSA_DEPOSIT_DETAILS.accountName}</Text>
        <Text style={styles.meta}>Account: {ABSA_DEPOSIT_DETAILS.accountNumber}</Text>
        <Text style={styles.meta}>Paybill: {ABSA_DEPOSIT_DETAILS.paybill}</Text>
      </Card>
      <Text style={styles.section}>Transactions</Text>
      {q.data.tx.map((t) => (
        <View key={t.id} style={styles.txRow}>
          <View>
            <Text style={styles.txTitle}>{t.type} · {t.memberName}</Text>
            <Text style={styles.txRef}>{t.reference}</Text>
          </View>
          <View style={styles.txRight}>
            <Text style={styles.txAmount}>{formatKes(t.amountKes)}</Text>
            <Badge label={t.status} variant={t.status === 'completed' ? 'success' : 'warning'} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[2], paddingBottom: spacing[6] },
  balanceLabel: { color: colors.textMuted },
  balance: { fontSize: 28, fontWeight: '700', color: colors.text, marginVertical: spacing[1] },
  mt: { marginTop: spacing[1] },
  section: { fontWeight: '600', marginTop: spacing[3], marginBottom: spacing[1], color: colors.text },
  meta: { color: colors.text, fontSize: 14, marginBottom: 4 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  txTitle: { fontWeight: '600', color: colors.text },
  txRef: { fontSize: 12, color: colors.textMuted },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontWeight: '600', color: colors.text },
});
