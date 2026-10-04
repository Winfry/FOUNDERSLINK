import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, HandCoins, UsersRound } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Badge, Button, Card, Input, useToast } from '../ui';
import { ScreenError, ScreenLoading } from '../layout/ScreenStates';
import { ROLE_LABEL, TYPE_LABEL } from './parts';
import { circleService } from '../../services';
import { colors, radius, spacing } from '../../theme/tokens';
import type { ApiError } from '../../types';

type CircleType = 'money' | 'learning';

const TYPES: { value: CircleType; label: string; about: string }[] = [
  { value: 'money', label: 'Money circle', about: 'People who know each other, saving towards shared goals. Members join by invite only.' },
  { value: 'learning', label: 'Learning circle', about: 'No money. A group that learns together.' },
];

/** The chamas tab, the same for a founder and an investor. */
export function ChamasList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
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
      toast.show(`${circle.name} is ready`, 'success');
      router.push(`/chama/${circle.id}`);
    },
  });
  const createError = (create.error as ApiError | null)?.message;

  if (q.isLoading) return <ScreenLoading />;
  // The backend's own words, e.g. when the account is not approved yet.
  if (q.isError) {
    const e = q.error as unknown as ApiError;
    return <ScreenError message={e.message} code={e.code} onRetry={() => q.refetch()} />;
  }

  const circles = q.data ?? [];

  const form = (
    <Card style={styles.form}>
      <Text style={styles.formTitle}>Start a chama</Text>
      <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Gikomba Traders Chama" maxLength={80} />
      <View style={styles.types}>
        <Text style={styles.label}>What kind?</Text>
        {TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setType(t.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: type === t.value }}
            style={[styles.type, type === t.value && styles.typeOn]}
          >
            <View style={[styles.radio, type === t.value && styles.radioOn]}>
              {type === t.value ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.typeText}>
              <Text style={styles.typeLabel}>{t.label}</Text>
              <Text style={styles.meta}>{t.about}</Text>
            </View>
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
  );

  const header = (
    <View style={styles.head}>
      <Text style={styles.heading}>Chamas</Text>
      <Text style={styles.sub}>Save or learn with people you trust.</Text>
      {creating ? form : circles.length > 0 ? <Button title="Start a chama" onPress={() => setCreating(true)} style={styles.start} /> : null}
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={circles}
      keyExtractor={(c) => c.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={
        creating ? null : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <HandCoins size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>You're not in a chama yet</Text>
            <Text style={styles.emptyBody}>
              A chama is a group of people who save or learn together. FoundersLink only records contributions: the money stays in
              the chama's own Paybill or account.
            </Text>
            <Button title="Start a chama" onPress={() => setCreating(true)} style={styles.emptyBtn} />
            <Text style={styles.meta}>Invited by an organiser? Open their invite link to join.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/chama/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.name}`}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.name}</Text>
              <ChevronRight size={20} color={colors.textMuted} />
            </View>
            <View style={styles.facts}>
              <Badge label={TYPE_LABEL[item.type]} variant={item.type === 'money' ? 'default' : 'muted'} />
              {item.myRole ? <Badge label={`You: ${ROLE_LABEL[item.myRole]}`} variant="muted" /> : null}
            </View>
            <View style={styles.members}>
              <UsersRound size={16} color={colors.textMuted} />
              <Text style={styles.membersText}>
                {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  list: { flexGrow: 1, paddingHorizontal: spacing[2], paddingBottom: spacing[4], gap: spacing[2] },
  head: { gap: spacing[0.5] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, fontWeight: '500', color: colors.textMuted },
  start: { marginTop: spacing[2] },
  form: { gap: spacing[1.5], marginTop: spacing[2] },
  formTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  types: { gap: spacing[1] },
  type: {
    flexDirection: 'row',
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing[1.5],
    minHeight: 48,
  },
  typeOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.grey300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, fontWeight: '500', color: colors.textMuted, textAlign: 'left' },
  error: { color: colors.error, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.85 },
  card: { gap: spacing[1.5] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  members: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  membersText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[1], gap: spacing[1] },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 16, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
  emptyBtn: { alignSelf: 'stretch', marginTop: spacing[2], marginBottom: spacing[1] },
});
