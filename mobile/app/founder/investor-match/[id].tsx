import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Info, Lock, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button, Card } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { bandMeta, Chip, kes, ReasonRow, splitHeadline, words } from '../../../src/components/matches/parts';
import { useToast } from '../../../src/components/ui/Toast';
import { connectionService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { verificationWords } from '../../../src/lib/verification-state';
import type { MatchBand } from '../../../src/types';
import { colors, spacing, touchTargetMin } from '../../../src/theme/tokens';

type Reason = { signal?: string; fits: boolean; text: string };
type TrackEntry = { label: string; source: string };
type Gap = { kind?: string; ref?: string; title: string };
type Risk = { code?: string; text: string };

// The verdict block is the one bold thing on this screen. Orange is kept for a strong fit.
const HERO: Record<MatchBand, { bg: string; fg: string; sub: string }> = {
  strong: { bg: colors.accent, fg: colors.primaryDark, sub: colors.primaryDark },
  good: { bg: colors.primaryDark, fg: colors.white, sub: '#D6E4FB' },
  possible: { bg: colors.primaryLight, fg: colors.primaryDark, sub: colors.text },
  not_a_fit: { bg: colors.grey100, fg: colors.text, sub: colors.textMuted },
};

function sourceBadge(source: string): { label: string; variant: 'success' | 'default' | 'muted' } {
  if (source === 'platform_deal') return { label: 'Verified on FoundersLink', variant: 'success' };
  if (source === 'public') return { label: 'Public source', variant: 'default' };
  return { label: 'Self-reported', variant: 'muted' };
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export default function InvestorMatchProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const q = useQuery({ queryKey: ['investor-profile', id], queryFn: () => fundingService.getInvestorProfile(String(id)) });
  const [sending, setSending] = useState(false);

  const { show } = useToast();

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError || !q.data) {
    const err = q.error as { message?: string; code?: string } | null;
    return (
      <ScreenError
        message={err?.message ?? 'This investor did not load. Check your connection and try again.'}
        code={err?.code}
        onRetry={() => q.refetch()}
      />
    );
  }

  const data = q.data;
  const reasons = (data.reasons as Reason[]) ?? [];
  const track = (data.trackRecord as TrackEntry[]) ?? [];
  const anonymised = data.anonymised === true;
  const band = ((data.band as MatchBand | null | undefined) ?? 'not_a_fit') as MatchBand;
  const meta = bandMeta[band];
  const hero = HERO[band];
  const fitCount = reasons.filter((r) => r.fits).length;
  // What stands between her and pitching this investor. With a gap open,
  // the verdict must not read as "go ahead".
  const gaps = (Array.isArray(data.gaps) ? (data.gaps as Gap[]) : []).filter((g) => g && typeof g.title === 'string');
  const risks = (Array.isArray(data.riskFactors) ? (data.riskFactors as Risk[]) : []).filter((r) => r && typeof r.text === 'string');
  const hasGaps = gaps.length > 0 && band !== 'not_a_fit';
  const things = gaps.length === 1 ? 'one thing' : `${gaps.length} things`;
  const verdictLabel = hasGaps ? `${meta.label}, once you fix ${things}` : meta.label;
  const verdictText = hasGaps
    ? `Pitch them after you sort out what is listed below. The rest of what they look for matches.`
    : meta.verdict;

  // A record with no name is known by its headline; show its parts, never the sentence.
  const rawName = String(data.displayName ?? 'Investor');
  const fundText = String(data.whatTheyFund ?? '');
  const headline = splitHeadline(rawName) ?? splitHeadline(fundText);
  const name = rawName.includes(' · ') ? (splitHeadline(rawName)?.kind ?? 'Investor') : rawName;
  const mandate = fundText && !fundText.includes(' · ') ? fundText : '';

  // What they fund, as facts. The service may hand these over directly;
  // until it does, they are read from the headline and the amount reason.
  const sectors = strings(data.sectors).map(words);
  const stages = strings(data.stages).map(words);
  const min = typeof data.ticketMinKes === 'number' ? data.ticketMinKes : null;
  const max = typeof data.ticketMaxKes === 'number' ? data.ticketMaxKes : null;
  const rangeInReason = reasons.map((r) => /KSh [\d,]+ to KSh [\d,]+$/.exec(r.text)?.[0]).find(Boolean);
  const ticket = min !== null && max !== null ? `${kes(min)} to ${kes(max)}` : (headline?.ticket ?? rangeInReason ?? '');
  const sectorChips = sectors.length > 0 ? sectors : (headline?.sectors ?? []);
  const hasFacts = sectorChips.length > 0 || stages.length > 0 || Boolean(ticket);

  // Who the request goes to. A match built from public information has
  // nobody behind it on FoundersLink, so there is no one to ask.
  const personId = (data.connectUserId as string | null | undefined) ?? (data.connectUserId === undefined ? String(id) : null);
  const verified = user?.approvalStatus === 'approved';
  const vw = verificationWords(user?.approvalStatus, 'founder');

  const connect = async () => {
    if (!verified) {
      router.push(vw.href);
      return;
    }
    if (!personId) {
      show('This investor is not on FoundersLink yet, so there is nobody to connect with here.', 'error');
      return;
    }
    setSending(true);
    try {
      await connectionService.request(personId, 'I would like to connect about my business.');
      show('Request sent', 'success');
      router.push('/(founder)/(tabs)/connections');
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Could not send the request', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{name}</Text>
      {anonymised ? (
        <View style={styles.note}>
          <Lock size={16} color={colors.textMuted} />
          <Text style={styles.noteText}>Their name shows once you are verified.</Text>
        </View>
      ) : null}

      <View style={[styles.hero, { backgroundColor: hero.bg }]}>
        <Text style={[styles.heroLabel, { color: hero.sub }]}>How well you fit</Text>
        <Text style={[styles.heroVerdict, { color: hero.fg }]}>{verdictLabel}</Text>
        <Text style={[styles.heroText, { color: hero.sub }]}>{verdictText}</Text>
        {reasons.length > 0 ? (
          <View style={styles.heroCount}>
            <Text style={[styles.heroCountText, { color: hero.fg }]}>
              {fitCount} of {reasons.length} things they look for match
            </Text>
          </View>
        ) : null}
      </View>

      {gaps.length > 0 ? (
        <Pressable
          style={({ pressed }) => [styles.gapBox, pressed && styles.dim]}
          onPress={() => router.push('/(founder)/(tabs)/readiness')}
          accessibilityRole="button"
          accessibilityLabel={`Fix this first: ${gaps.map((g) => g.title).join(', ')}. Open Readiness`}
        >
          <View style={styles.gapIcon}>
            <Wrench size={16} color={colors.primaryDark} />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.gapLabel}>Fix this first</Text>
            {gaps.map((g) => (
              <Text key={g.title} style={styles.gapText}>
                {g.title}
              </Text>
            ))}
            <Text style={styles.gapLink}>
              {gaps.some((g) => g.kind === 'requirement') ? 'Sort it out in Readiness' : 'Answer it in Readiness'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.primary} />
        </Pressable>
      ) : null}

      {risks.map((r) => (
        <View key={r.text} style={styles.note}>
          <Info size={16} color={colors.textMuted} />
          <Text style={styles.noteText}>{r.text}</Text>
        </View>
      ))}

      {reasons.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why</Text>
          <Card style={styles.card}>
            {reasons.map((r, i) => (
              <View key={r.text} style={[styles.row, i > 0 && styles.rowDivider]}>
                <ReasonRow fits={r.fits} text={r.text} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What they fund</Text>
        {mandate ? <Text style={styles.body}>{mandate}</Text> : null}
        {sectorChips.length > 0 ? (
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Sectors</Text>
            <View style={styles.chips}>
              {sectorChips.map((s) => (
                <Chip key={s} label={s} />
              ))}
            </View>
          </View>
        ) : null}
        {stages.length > 0 ? (
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Stages</Text>
            <View style={styles.chips}>
              {stages.map((s) => (
                <Chip key={s} label={s} />
              ))}
            </View>
          </View>
        ) : null}
        {ticket ? (
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Ticket size</Text>
            <View style={styles.chips}>
              <Chip label={ticket} />
            </View>
          </View>
        ) : null}
        {!mandate && !hasFacts ? <Text style={styles.body}>They have not described what they fund yet.</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Track record</Text>
        {track.length > 0 ? (
          <Card style={styles.card}>
            {track.map((t, i) => {
              const badge = sourceBadge(t.source);
              // The label arrives as "Company, stage, year"; the company leads and the rest is detail.
              const [company, ...rest] = t.label.split(', ');
              const detail = rest.map((part) => (/^\d{4}$/.test(part) ? part : `${words(part)} stage`)).join(', ');
              return (
                <View key={`${t.label}-${i}`} style={[styles.trackRow, i > 0 && styles.rowDivider]}>
                  <View>
                    <Text style={styles.trackLabel}>{company}</Text>
                    {detail ? <Text style={styles.trackDetail}>{detail}</Text> : null}
                  </View>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
              );
            })}
          </Card>
        ) : (
          <Text style={styles.body}>No track record shared yet.</Text>
        )}
      </View>

      <View style={styles.action}>
        {!personId && verified ? (
          <View style={styles.infoBox}>
            <Info size={20} color={colors.primaryDark} />
            <Text style={styles.infoText}>
              This investor is not on FoundersLink yet, so there is nobody to connect with here.
            </Text>
          </View>
        ) : (
          <>
            <Button
              title={verified ? 'Connect' : vw.kind === 'verify' ? 'Verify to connect' : vw.action}
              variant={verified || vw.starts ? 'primary' : 'secondary'}
              loading={sending}
              onPress={() => void connect()}
            />
            <Text style={styles.actionHint}>
              {verified
                ? 'They get a request from you. You can chat once they accept.'
                : vw.kind === 'verify'
                  ? 'Verify once, and you can send investors a request to connect.'
                  : `${vw.title}. ${vw.body}`}
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[6] },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1], marginTop: spacing[1] },
  noteText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textMuted },

  hero: { marginTop: spacing[2], padding: spacing[3], borderRadius: 20, gap: spacing[0.5] },
  heroLabel: { fontSize: 14, fontWeight: '600' },
  heroVerdict: { fontSize: 24, fontWeight: '800' },
  heroText: { fontSize: 16, fontWeight: '500', marginTop: spacing[0.5] },
  heroCount: { marginTop: spacing[1.5] },
  heroCountText: { fontSize: 14, fontWeight: '700' },

  flexOne: { flex: 1 },
  dim: { opacity: 0.6 },
  gapBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    padding: spacing[1.5],
    marginTop: spacing[2],
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    minHeight: touchTargetMin,
  },
  gapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapLabel: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  gapText: { fontSize: 16, fontWeight: '700', color: colors.text },
  gapLink: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 2 },

  section: { marginTop: spacing[3], gap: spacing[1.5] },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  card: { borderRadius: 16, paddingVertical: spacing[0.5] },
  row: { paddingVertical: spacing[1.5] },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.text },

  fact: { gap: spacing[1] },
  factLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },

  trackRow: { paddingVertical: spacing[1.5], gap: spacing[1] },
  trackLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  trackDetail: { fontSize: 14, fontWeight: '500', color: colors.textMuted },

  action: { marginTop: spacing[4], gap: spacing[1] },
  actionHint: { fontSize: 14, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1.5],
    padding: spacing[2],
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
  },
  infoText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
});
