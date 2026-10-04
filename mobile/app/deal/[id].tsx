import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button } from '../../src/components/ui';
import { ScreenLoading } from '../../src/components/layout/ScreenStates';
import { dealService } from '../../src/services';
import { formatKes } from '../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../src/theme/tokens';

const STAGES = ['exploring', 'due_diligence', 'terms_agreed', 'documents_compliance', 'closed', 'active'] as const;

export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['deal', id], queryFn: () => dealService.get(String(id)) });

  if (q.isLoading || !q.data) return <ScreenLoading />;

  const deal = q.data;
  const stageIndex = STAGES.indexOf(deal.stage);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{deal.title}</Text>
      <Badge label={deal.stage.replace(/_/g, ' ')} />
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${((stageIndex + 1) / STAGES.length) * 100}%` }]} />
      </View>
      <Text style={styles.section}>Terms</Text>
      <Text style={styles.body}>Amount: {formatKes(deal.terms.amountKes)}</Text>
      <Text style={styles.body}>Instrument: {deal.terms.instrument.replace('_', ' ')}</Text>
      {deal.stage === 'due_diligence' ? (
        <Button title="Upload business document (mock)" onPress={() => dealService.uploadDocument(deal.id, 'BRS.pdf').then(() => q.refetch())} />
      ) : null}
      {deal.documents.map((d) => (
        <Text key={d.id} style={styles.body}>
          {d.name} — {d.precheckStatus === 'ai_pre_checked' ? 'AI pre-checked' : d.precheckStatus === 'confirmed_by_founderlink' ? 'Confirmed by FounderLink' : 'Pending'}
        </Text>
      ))}
      {deal.stage === 'closed' || deal.stage === 'active' ? (
        <Text style={styles.closedCopy}>
          The money moves between you and the investor through a bank. FounderLink records the deal.
        </Text>
      ) : null}
      <Button title="Confirm terms" variant="secondary" onPress={() => dealService.confirmTerms(deal.id).then(() => q.refetch())} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[3], gap: 8, backgroundColor: colors.white },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  section: { fontWeight: '700', marginTop: spacing[2], color: colors.text },
  body: { color: colors.text, lineHeight: 20 },
  barTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginVertical: spacing[2] },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  closedCopy: { color: colors.textMuted, lineHeight: 20, marginTop: spacing[2] },
});
