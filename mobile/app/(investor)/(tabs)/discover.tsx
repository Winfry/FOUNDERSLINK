import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Card, Input, Select } from '../../../src/components/ui';
import { ScreenLoading, ScreenError } from '../../../src/components/layout/ScreenStates';
import { investorService } from '../../../src/services';
import { BUSINESS_SECTORS, formatKes, KENYAN_COUNTIES } from '../../../src/services/mocks/kenya-data';
import { colors, spacing } from '../../../src/theme/tokens';

export default function DiscoverScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [county, setCounty] = useState('');
  const q = useQuery({
    queryKey: ['discover', search, sector, county],
    queryFn: () => investorService.discover({ search, sector, county }),
  });

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError) return <ScreenError message="Could not load recommendations." onRetry={() => q.refetch()} />;

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        <Text style={styles.heading}>Discover</Text>
        <Text style={styles.sub}>Recommended for you based on your preferences</Text>
        <Input label="Search" value={search} onChangeText={setSearch} />
        <Select label="Sector" options={[{ label: 'All', value: '' }, ...BUSINESS_SECTORS.map((s) => ({ label: s.label, value: s.label }))]} value={sector} onChange={setSector} />
        <Select label="County" options={[{ label: 'All', value: '' }, ...KENYAN_COUNTIES.map((c) => ({ label: c.name, value: c.name }))]} value={county} onChange={setCounty} />
      </View>
      <FlatList
        data={q.data}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No founders match your filters</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/investor/founder/${item.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.name}>{item.businessName}</Text>
              <Text style={styles.meta}>{item.sector} · {item.stage} · {item.county}</Text>
              <Text style={styles.ask}>Ask: {formatKes(item.fundingAskKes)}</Text>
              {item.verifiedDocumentsBadge ? <Badge label="Verified documents" variant="success" /> : null}
              {item.matchReasons.map((r) => (
                <Text key={r} style={styles.reason}>• {r}</Text>
              ))}
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  filters: { padding: spacing[2], paddingTop: spacing[6], borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing[2] },
  list: { padding: spacing[2] },
  card: { marginBottom: spacing[2], gap: 4 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted },
  ask: { color: colors.text, fontWeight: '500' },
  reason: { fontSize: 13, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[4] },
});
