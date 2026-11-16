import { matchNeeds, MAY_NEED_NOTE, STEP_LABEL, whoYouMayNeed, type DealStep, type Side } from '@shared/deal-experts';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../ui';
import { Text } from '../ui/Text';
import { ExpertResult } from '../experts/ExpertResultCard';
import { expertService } from '../../services';
import { colors, spacing } from '../../theme/tokens';

/**
 * "Who you may need now", in a deal room. It changes with the deal's step
 * and its sector, and is said from her side: the founder gets her books
 * ready, the investor has the numbers checked. Each need comes with the best
 * verified expert for it, or says plainly that nobody offers it yet. One
 * need is open at a time, so the card stays short.
 */
export function WhoYouMayNeed({ stage, sector, side }: { stage: DealStep; sector?: string | null; side: Side }) {
  const router = useRouter();
  const experts = useQuery({ queryKey: ['experts'], queryFn: () => expertService.list(), staleTime: 60_000 });
  const needs = whoYouMayNeed(stage, { side, sector });
  const plan = matchNeeds(needs, experts.data ?? [], sector);
  const [open, setOpen] = useState<string | null>(null);

  if (needs.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.eyebrow}>{STEP_LABEL[stage]}</Text>
      <Text style={styles.title}>Who you may need now</Text>
      <Text style={styles.note}>{MAY_NEED_NOTE}</Text>

      {plan.map((p, i) => {
        const isOpen = open === p.id;
        return (
          <View key={p.id} style={[styles.need, i === 0 && styles.first]}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : p.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${p.who}. ${p.why} ${isOpen ? 'Hide' : 'Show'} who can help`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.who}>{p.who}</Text>
                <Text style={styles.why}>{p.why}</Text>
              </View>
              <Text style={styles.toggle}>{isOpen ? 'Hide' : 'See who'}</Text>
            </Pressable>
            {isOpen ? (
              experts.isLoading ? (
                <Text style={styles.none}>Looking for the right people…</Text>
              ) : experts.isError ? (
                <Text style={styles.none}>The experts did not load. Check your connection and try again.</Text>
              ) : p.expert ? (
                <ExpertResult e={p.expert} question={`${p.who} for our deal: ${p.why}`} area={p.area} />
              ) : (
                <Text style={styles.none}>No verified expert offers this on FoundersLink yet.</Text>
              )
            ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={() => router.push({ pathname: '/experts', params: { ask: side === 'founder' ? 'I’m preparing to raise investment. Who will I need?' : 'I’m preparing to invest. Who will I need at each step?' } } as never)}
        accessibilityRole="link"
        style={styles.more}
      >
        <Text style={styles.moreText}>See who you may need at every step</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: '500', color: colors.accentText },
  title: { fontSize: 18, color: colors.primaryDark },
  note: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginBottom: spacing[1] },
  need: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing[1.5] },
  first: { marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  pressed: { opacity: 0.85 },
  who: { fontSize: 15, fontWeight: '500', color: colors.text },
  why: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 2 },
  toggle: { fontSize: 13, fontWeight: '500', color: colors.primary, paddingTop: 2 },
  none: { fontSize: 13, color: colors.textDim, marginTop: spacing[1] },
  more: { paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  moreText: { fontSize: 14, fontWeight: '500', color: colors.primary },
});
