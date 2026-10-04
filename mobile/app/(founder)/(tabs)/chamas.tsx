import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button, Card, Input } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { circleService } from '../../../src/services';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import type { ApiError } from '../../../src/types';

type CircleType = 'money' | 'learning';

const TYPES: { value: CircleType; label: string; about: string }[] = [
  { value: 'money', label: 'Money circle', about: 'People who know each other, saving towards shared goals. Members join by invite only.' },
  { value: 'learning', label: 'Learning circle', about: 'No money. A group that learns together.' },
];

export default function ChamasScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['chamas'], queryFn: () => circleService.list() });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CircleType>('money');

  const create = useMutation({
    mutationFn: () => circleService.create({ name: name.trim(), type }),
    onSuccess: (circle) => {
      setCreating(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['chamas'] });
      router.push(`/chama/${circle.id}`);
    },
  });
  const createError = (create.error as ApiError | null)?.message;

  if (q.isLoading) return <ScreenLoading />;
  // The backend's own words, e.g. when the account is not approved yet.
  if (q.isError) return <ScreenError message={(q.error as unknown as ApiError).message} onRetry={() => q.refetch()} />;

  const form = creating ? (
    <Card style={styles.form}>
      <Text style={styles.name}>Create a chama</Text>
      <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Gikomba Traders Chama" maxLength={80} />
      <View style={styles.types}>
        {TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setType(t.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: type === t.value }}
            style={[styles.type, type === t.value && styles.typeOn]}
          >
            <Text style={styles.typeLabel}>{t.label}</Text>
            <Text style={styles.meta}>{t.about}</Text>
          </Pressable>
        ))}
      </View>
      {createError ? <Text style={styles.error}>{createError}</Text> : null}
      <Button title="Create chama" loading={create.isPending} disabled={name.trim().length < 3} onPress={() => create.mutate()} />
      <Button
        title="Cancel"
        variant="ghost"
        onPress={() => {
          setCreating(false);
          create.reset();
        }}
      />
    </Card>
  ) : (
    <Button title="Create a chama" variant="secondary" onPress={() => setCreating(true)} />
  );

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={q.data ?? []}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={form}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.name}>No chamas yet</Text>
          <Text style={styles.meta}>Create one, or join by invite link from an organiser.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/chama/${item.id}`)}>
          <Card>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.type === 'money' ? 'Money circle' : 'Learning circle'} · {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
              {item.myRole ? ` · You are ${item.myRole}` : ''}
            </Text>
            {item.paybillNumber ? <Text style={styles.meta}>Paybill: {item.paybillNumber}</Text> : null}
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], gap: spacing[2] },
  form: { gap: spacing[1] },
  types: { gap: spacing[1], marginBottom: spacing[1] },
  type: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing[2] },
  typeOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeLabel: { fontWeight: '600', color: colors.text },
  empty: { alignItems: 'center', padding: spacing[4] },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  error: { color: colors.error, fontSize: 14 },
});
