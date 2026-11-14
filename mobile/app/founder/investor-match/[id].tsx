import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Avatar, Badge, Button, Card, Fit } from '../../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { bandBars, bandMeta, Chip, kes, ReasonRow, splitHeadline, words } from '../../../src/components/matches/parts';
import { useToast } from '../../../src/components/ui/Toast';
import { connectionService, fundingService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import type { MatchBand } from '../../../src/types';
import { fitVerdict, type FitGap } from '../../../src/lib/fit-verdict';
import { colors, spacing } from '../../../src/theme/tokens';

type Reason = { signal?: string; fits: boolean; text: string };
type TrackEntry = { label: string; source: string };
type Note = { code?: string; text: string };

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

  // The page tells the same story as the list it was opened from: what is
  // still to fix comes with the verdict (FINAL_VERIFICATION 13).
  const verdict = fitVerdict(band, meta, Array.isArray(data.gaps) ? (data.gaps as FitGap[]) : [], reasons);
  const { fixFirst, gaps } = verdict;
  const notes = Array.isArray(data.riskFactors) ? (data.riskFactors as Note[]) : [];

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

  const connect = async () => {
    if (!verified) {
      router.push('/founder/verify');
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

  const fitLabel = fixFirst ? `${meta.label} after one fix` : meta.label;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.person}>
          <Avatar name={name} size={64} />
          <View style={styles.flexOne}>
            <Text style={styles.name} accessibilityRole="header">
              {name}
            </Text>
            {ticket ? <Text style={styles.sub}>{ticket}</Text> : null}
            {anonymised ? <Text style={styles.sub}>Their name shows once you are verified.</Text> : null}
            <View style={styles.fitGap}>
              <Fit label={fitLabel} filled={bandBars[band]} fix={fixFirst} />
            </View>
          </View>
        </View>
        <View style={styles.verdict}>
          <Text style={styles.verdictLabel}>{verdict.label}</Text>
          <Text style={styles.verdictText}>{verdict.text}</Text>
          {verdict.count ? <Text style={styles.count}>{verdict.count}</Text> : null}
        </View>
      </Card>

      {fixFirst ? (
        <Card style={styles.block}>
          <Text style={styles.label}>Fix this first</Text>
          <View style={styles.list}>
            {gaps.map((g, i) => (
              <View key={g.text} style={[styles.row, i > 0 && styles.rowDivider]}>
                <ReasonRow n={i + 1} fits text={g.text} />
              </View>
            ))}
          </View>
          <Button
            title={verdict.answerOnly ? 'Answer it in Readiness' : 'Sort it out in Readiness'}
            variant="soft"
            onPress={() => router.push('/(founder)/(tabs)/readiness')}
            accessibilityLabel={`Fix this first: ${gaps.map((g) => g.text).join(', ')}. Open Readiness`}
            style={styles.blockButton}
          />
        </Card>
      ) : null}

      {notes.length > 0 ? (
        <View style={styles.notes}>
          {notes.map((n) => (
            <Text key={n.text} style={[styles.note, n.code === 'demo_data' && styles.noteStrong]}>
              {n.text}
            </Text>
          ))}
        </View>
      ) : null}

      {reasons.length > 0 ? (
        <Card style={styles.block}>
          <Text style={styles.label}>{band === 'not_a_fit' ? 'Why not' : 'Why they fit'}</Text>
          <View style={styles.list}>
            {reasons.map((r, i) => (
              <View key={r.text} style={[styles.row, i > 0 && styles.rowDivider]}>
                <ReasonRow n={i + 1} fits={r.fits} text={r.text} />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={styles.block}>
        <Text style={styles.label}>What they fund</Text>
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
      </Card>

      <Card style={styles.block}>
        <Text style={styles.label}>Track record</Text>
        {track.length > 0 ? (
          <View style={styles.list}>
            {track.map((t, i) => {
              const badge = sourceBadge(t.source);
              // The label arrives as "Company, stage, year"; the company leads and the rest is detail.
              const [company, ...rest] = t.label.split(', ');
              const detail = rest.map((part) => (/^\d{4}$/.test(part) ? part : `${words(part)} stage`)).join(', ');
              return (
                <View key={`${t.label}-${i}`} style={[styles.trackRow, i > 0 && styles.rowDivider]}>
                  <View style={styles.flexOne}>
                    <Text style={styles.trackLabel}>{company}</Text>
                    {detail ? <Text style={styles.trackDetail}>{detail}</Text> : null}
                  </View>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.body}>No track record shared yet.</Text>
        )}
      </Card>

      <View style={styles.action}>
        {!personId && verified ? (
          <Text style={styles.infoText}>
            This investor is not on FoundersLink yet, so there is nobody to connect with here.
          </Text>
        ) : (
          <>
            <Button title={verified ? 'Ask to connect' : 'Verify to connect'} loading={sending} onPress={() => void connect()} />
            <Text style={styles.actionHint}>
              {verified
                ? 'They get a request from you. You can chat once they accept.'
                : 'Verify once, and you can send investors a request to connect.'}
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[2], paddingBottom: spacing[6], width: '100%', maxWidth: 760, alignSelf: 'center' },
  flexOne: { flex: 1, minWidth: 0 },

  person: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  name: { fontSize: 22, fontWeight: '500', color: colors.primaryDark },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  fitGap: { marginTop: spacing[1] },

  verdict: { marginTop: spacing[2], paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  verdictLabel: { fontSize: 18, color: colors.primaryDark },
  verdictText: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  count: { fontSize: 13, color: colors.text, marginTop: 4 },

  block: { marginTop: spacing[1.5] },
  blockButton: { marginTop: spacing[1.5] },
  label: { fontSize: 12, color: colors.textMuted },
  list: { marginTop: spacing[1] },
  row: { paddingVertical: spacing[1] },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },

  notes: { marginTop: spacing[1.5], gap: spacing[1], paddingHorizontal: 4 },
  note: { fontSize: 13, color: colors.textMuted },
  noteStrong: { color: colors.primaryDark, fontWeight: '500' },

  body: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: spacing[1] },
  fact: { gap: spacing[1], marginTop: spacing[1.5] },
  factLabel: { fontSize: 12, color: colors.textDim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },

  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[1.5], gap: spacing[1.5] },
  trackLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  trackDetail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  action: { marginTop: spacing[3], gap: spacing[1] },
  actionHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  infoText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
