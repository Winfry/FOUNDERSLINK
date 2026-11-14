import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { Button, Card, Input, useToast } from '../ui';
import { Tag } from '../overview/parts';
import { ScreenError, ScreenLoading } from '../layout/ScreenStates';
import { ROLE_LABEL, TYPE_LABEL } from './parts';
import { circleService } from '../../services';
import { colors, radius, spacing } from '../../theme/tokens';
import type { ApiError } from '../../types';
import { PageTitle } from '../layout/PageTitle';

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
              <Text style={styles.about}>{t.about}</Text>
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
      <PageTitle title="Chamas" subtitle="Save or learn with other founders you trust." />
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
      ListFooterComponent={
        circles.length > 0 ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              FoundersLink never holds the money. It records what members pay into the chama's own Paybill or account.
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        creating ? null : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Save together with founders you trust</Text>
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
              <Text style={styles.open}>Open</Text>
            </View>
            <Text style={styles.membersText}>
              {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
              {item.myRole ? ` · You are ${ROLE_LABEL[item.myRole].toLowerCase()}` : ''}
            </Text>
            <View style={styles.facts}>
              <Tag label={TYPE_LABEL[item.type]} tone={item.type === 'money' ? 'todo' : 'quiet'} />
              {item.unreadChatCount > 0 ? <Tag label={`${item.unreadChatCount} new`} tone="new" /> : null}
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: 'transparent' },
  list: { flexGrow: 1, paddingHorizontal: spacing[2], paddingBottom: spacing[4], gap: spacing[1.5] },
  head: { gap: spacing[0.5] },
  start: { marginTop: spacing[0.5], marginBottom: spacing[0.5] },
  form: { gap: spacing[1.5], marginTop: spacing[0.5] },
  formTitle: { fontSize: 17, fontWeight: '500', color: colors.primaryDark },
  label: { fontSize: 13, fontWeight: '500', color: colors.text },
  types: { gap: spacing[1] },
  type: {
    flexDirection: 'row',
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[1.5],
    minHeight: 48,
  },
  typeOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  about: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.error, fontSize: 14 },
  pressed: { opacity: 0.85 },
  card: { gap: spacing[1] },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[1] },
  name: { flex: 1, fontSize: 17, fontWeight: '500', color: colors.primaryDark },
  open: { fontSize: 13, fontWeight: '500', color: colors.primary },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  membersText: { fontSize: 13, color: colors.textMuted },
  note: { backgroundColor: colors.primaryLight, borderRadius: radius.card, padding: spacing[2] },
  noteText: { fontSize: 13, color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[1], gap: spacing[1] },
  emptyTitle: { fontSize: 24, color: colors.primaryDark, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 380 },
  emptyBtn: { alignSelf: 'stretch', marginTop: spacing[2], marginBottom: spacing[1] },
});
