import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import type { MatchBand, MatchReason } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted' | 'accent';

/** How each fit band reads, on a card and as the verdict on the investor's page. */
export const bandMeta: Record<MatchBand, { label: string; verdict: string; badge: BadgeVariant }> = {
  strong: { label: 'Strong fit', verdict: 'Pitch them. This is one of your best matches.', badge: 'accent' },
  good: { label: 'Good fit', verdict: 'Worth pitching. You match what they fund.', badge: 'default' },
  possible: { label: 'Possible fit', verdict: 'Some of it matches. Read the reasons before you pitch.', badge: 'muted' },
  not_a_fit: { label: 'Not a fit', verdict: 'Not for you right now. Your time is better spent elsewhere.', badge: 'muted' },
};

/** How many of the three fit bars each band fills. */
export const bandBars: Record<MatchBand, number> = { strong: 3, good: 2, possible: 1, not_a_fit: 0 };

// The reasons that tell her the most come first.
const SIGNAL_ORDER = ['sector', 'amount', 'stage', 'instrument', 'mandate', 'county', 'journey'];

function rank(signal: string) {
  const i = SIGNAL_ORDER.indexOf(signal);
  return i === -1 ? SIGNAL_ORDER.length : i;
}

/** The reasons worth showing on a card: what fails first on a "don't pitch" card, what fits first otherwise. */
export function topReasons(reasons: MatchReason[], count: number, missesFirst: boolean): MatchReason[] {
  return [...reasons]
    .sort((a, b) => {
      if (a.fits !== b.fits) return (a.fits ? 1 : -1) * (missesFirst ? 1 : -1);
      return rank(a.signal) - rank(b.signal);
    })
    .slice(0, count);
}

/** "early_revenue" → "Early revenue". Nothing snake_case reaches the screen. */
export function words(value: string): string {
  const s = value.replace(/_/g, ' ').trim();
  if (s.toLowerCase() === 'mvp') return 'MVP';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function kes(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

/**
 * A record with no name is known by its headline, three facts joined
 * with a dot ("Angel investor · health, fintech · KSh 500,000 to KSh 5,000,000").
 * This takes it apart so each fact can be shown in its own place.
 */
export function splitHeadline(headline: string): { kind: string; sectors: string[]; ticket?: string } | null {
  const parts = headline.split(' · ').map((p) => p.trim());
  if (parts.length < 2) return null;
  const ticket = parts.find((p) => /^KSh\b/i.test(p) || /^up to KSh/i.test(p));
  const sectors = parts
    .slice(1)
    .filter((p) => p !== ticket)
    .flatMap((p) => p.split(',').map((s) => words(s)))
    .filter(Boolean);
  return { kind: parts[0], sectors, ticket };
}

/**
 * One reason, in words. With `n` it is numbered ("01"), as in the approved
 * design; without, a quiet "Yes" or "No" leads it. A reason that does not
 * fit is greyed and says so under it.
 */
export function ReasonRow({ fits, text, compact, n }: { fits: boolean; text: string; compact?: boolean; n?: number }) {
  const lead = n !== undefined ? String(n).padStart(2, '0') : fits ? 'Yes' : 'No';
  return (
    <View style={styles.reasonRow} accessibilityLabel={`${fits ? 'Fits' : 'Does not fit'}: ${text}`}>
      <Text style={[styles.lead, n === undefined && fits && styles.leadYes]}>{lead}</Text>
      <View style={styles.reasonWords}>
        <Text style={[compact ? styles.reasonTextCompact : styles.reasonText, !fits && styles.reasonMiss]}>{text}</Text>
        {n !== undefined && !fits ? <Text style={styles.missNote}>Does not match</Text> : null}
      </View>
    </View>
  );
}

/** A fact in a small outlined pill: a sector, a stage, a ticket size. */
export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  lead: { width: 26, fontSize: 12, lineHeight: 20, color: colors.textDim },
  leadYes: { color: colors.success },
  reasonWords: { flex: 1 },
  reasonText: { fontSize: 15, lineHeight: 22, color: colors.text },
  reasonTextCompact: { fontSize: 14, lineHeight: 20, color: colors.text },
  reasonMiss: { color: colors.textMuted },
  missNote: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  chip: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.text },
});
