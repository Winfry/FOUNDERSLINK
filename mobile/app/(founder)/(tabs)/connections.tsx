import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card } from '../../../src/components/ui';
import { ScreenEmpty, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { connectionService, dealService } from '../../../src/services';
import { formatKes } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function ConnectionsScreen() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['connections'], queryFn: () => connectionService.list() });

  if (q.isLoading) return <ScreenLoading />;
  const received = (q.data ?? []).filter((c) => c.direction === 'received');
  const sent = (q.data ?? []).filter((c) => c.direction === 'sent');

  const accept = async (id: string, proposedAmountKes: number, withUserId: string) => {
    await connectionService.respond(id, true);
    const deal = await dealService.createInvestment(withUserId, 'Investment deal');
    await dealService.updateTerms(deal.id, { amountKes: proposedAmountKes, instrument: 'equity' });
    router.push(`/deal/${deal.id}`);
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>Received join requests</Text>
          {received.length === 0 ? <Text style={styles.emptyLine}>No pending join requests.</Text> : null}
        </>
      }
      data={received}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.name}>{item.withFullName}</Text>
          <Text style={styles.meta}>{item.withOrganisationName}</Text>
          <Text style={styles.body}>{item.pitch}</Text>
          <Text style={styles.body}>Proposed amount: {formatKes(item.proposedAmountKes)}</Text>
          <View style={styles.actions}>
            <Button title="Accept" onPress={() => void accept(item.id, item.proposedAmountKes, item.withUserId)} />
            <Button title="Decline" variant="secondary" onPress={() => connectionService.respond(item.id, false, 'Not the right time')} />
          </View>
        </Card>
      )}
      ListFooterComponent={
        <>
          <Text style={[styles.heading, { marginTop: spacing[3] }]}>Sent requests</Text>
          {sent.length === 0 ? <Text style={styles.emptyLine}>No sent requests.</Text> : null}
          {sent.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Text style={styles.name}>{item.withFullName}</Text>
              <Badge label={item.status} />
            </Card>
          ))}
          <Button title="Open conversations" variant="ghost" onPress={() => router.push('/conversations')} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[2] },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  emptyLine: { color: colors.textMuted, marginBottom: spacing[2] },
  card: { marginBottom: spacing[2], gap: 6 },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  actions: { gap: 8, marginTop: 8 },
});
