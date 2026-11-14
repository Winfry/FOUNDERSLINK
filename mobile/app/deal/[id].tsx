import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Avatar, Badge, Button, Card, ConfirmModal } from '../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { useToast } from '../../src/components/ui/Toast';
import { StageStepper, stageLabel } from '../../src/components/deal/StageStepper';
import { dealService } from '../../src/services';
import { formatKes } from '../../src/services/mocks/kenya-data';
import { useAuthStore } from '../../src/stores/authStore';
import type { Deal, DealDocument, Instrument } from '../../src/types';
import { colors, radius, spacing } from '../../src/theme/tokens';

// Read by any key: a deal from before loans were dropped (TEAM_DECISIONS
// D11) still shows what it says.
const INSTRUMENT: Record<Instrument, string> & Record<string, string | undefined> = {
  equity: 'Equity',
  convertible_note: 'Convertible note',
  loan: 'Loan',
};

const REJECTED = /^Not accepted:\s*/;

// What a shared document's badge says. "AI pre-checked" only when the status says so.
function documentState(d: DealDocument): { label: string; variant: 'muted' | 'default' | 'success' | 'error' } {
  if (d.summary && REJECTED.test(d.summary)) return { label: 'Not accepted', variant: 'error' };
  if (d.precheckStatus === 'ai_pre_checked') return { label: 'AI pre-checked', variant: 'default' };
  if (d.precheckStatus === 'confirmed_by_founderlink') return { label: 'Confirmed by FoundersLink', variant: 'success' };
  return { label: 'Uploaded', variant: 'muted' };
}

// "KRA PIN certificate (Amina Njeri)" is the document and who shared it.
function splitName(name: string) {
  const m = /^(.*) \(([^()]+)\)$/.exec(name);
  return m ? { title: m[1], owner: m[2] } : { title: name, owner: undefined };
}

function when(at: string) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time}`;
}

export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Asked again every few seconds: the other party and staff change a deal too.
  const q = useQuery({ queryKey: ['deal', id], queryFn: () => dealService.get(String(id)), refetchInterval: 6000 });
  const me = useAuthStore((s) => s.user?.id);
  const [busy, setBusy] = useState<string | null>(null);
  // Closing a deal is asked twice: it is the one step that cannot be taken back.
  const [confirmClose, setConfirmClose] = useState(false);

  const { show } = useToast();

  if (q.isError && !q.data) {
    const e = q.error as { message?: string; code?: string } | null;
    return <ScreenError message={e?.message ?? 'Check your connection and try again.'} code={e?.code} onRetry={() => void q.refetch()} />;
  }
  if (q.isLoading || !q.data) return <ScreenLoading />;

  const deal = q.data;

  // Runs a change, shows the new state, and says why if it was refused
  // (for example, a document is still missing before terms).
  const run = (key: string, change: () => Promise<Deal>, done: (after: Deal) => string | null) => {
    setBusy(key);
    return change()
      .then((after) => {
        const message = done(after);
        if (message) show(message, 'success');
      })
      .catch((e: { message?: string }) => show(e?.message ?? 'Something went wrong', 'error'))
      .finally(() => {
        setBusy(null);
        void q.refetch();
      });
  };

  // A stage that needs every party does not move on the first press.
  const moved = (after: Deal) =>
    after.stage !== deal.stage
      ? `The deal is now at: ${stageLabel(after.stage)}`
      : 'Recorded. The deal moves on when the other party confirms.';

  const required = deal.requiredDocuments ?? [];
  const missing = deal.dueDiligenceSummary?.missing ?? [];
  const awaiting = deal.dueDiligenceSummary?.awaitingConfirmation ?? [];
  const atDueDiligence = deal.stage === 'due_diligence';
  const isClosed = deal.stage === 'closed' || deal.stage === 'active';
  const showDiligence = atDueDiligence || deal.documents.length > 0;
  const iConfirmed = deal.confirmations.some((c) => c.userId === me && c.confirmed);
  const waitingOn = deal.confirmations.filter((c) => !c.confirmed && c.userId !== me).map((c) => c.name);
  const checklistDone = deal.checklist.filter((c) => c.done).length;

  // The one thing she can do at this stage.
  const action: { title: string; help: string; onPress: () => void } | null =
    deal.stage === 'exploring'
      ? {
          title: 'Move to due diligence',
          help: 'Starts due diligence: each of you shares the documents this deal asks for.',
          onPress: () => void run('main', () => dealService.advanceStage(deal.id), moved),
        }
      : atDueDiligence && !iConfirmed
        ? {
            title: 'Confirm terms',
            help: 'Says you agree to the terms above. They are agreed once every party has confirmed.',
            onPress: () => void run('main', () => dealService.confirmTerms(deal.id), moved),
          }
        : deal.stage === 'terms_agreed'
          ? {
              title: 'Move to documents and compliance',
              help: 'Opens the list of paperwork to finish before the deal can close.',
              onPress: () => void run('main', () => dealService.advanceStage(deal.id), moved),
            }
          : deal.stage === 'documents_compliance'
            ? {
                title: 'Close the deal',
                help: 'Closing needs every party. The first to press proposes it, and the others confirm.',
                onPress: () => setConfirmClose(true),
              }
            : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ConfirmModal
        visible={confirmClose}
        title="Close this deal?"
        message="Closing says the investment is done. Once every party has confirmed, the deal cannot be reopened."
        confirmLabel="Close the deal"
        loading={busy === 'main'}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          void run('main', () => dealService.advanceStage(deal.id), moved);
        }}
      />
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {deal.title}
        </Text>
        {deal.withName ? (
          <View style={styles.withRow}>
            <Avatar name={deal.withName} size={32} />
            <Text style={styles.withText}>With {deal.withName}</Text>
          </View>
        ) : null}
      </View>

      <Card style={styles.card}>
        <Text style={styles.label}>Where the deal stands</Text>
        <StageStepper stage={deal.stage} />
      </Card>

      {isClosed ? (
        <View style={styles.closed}>
          <Badge label="Closed" variant="success" />
          <Text style={styles.closedTitle}>This deal is closed</Text>
          <Text style={styles.closedCopy}>
            The money moves between the parties through their bank. FoundersLink records the deal and never holds the money.
          </Text>
        </View>
      ) : null}

      <View style={styles.terms}>
        <Text style={styles.termsLabel}>Terms</Text>
        {/* Said from the start, not only once the deal closes (TEAM_DECISIONS D11; FINAL_VERIFICATION section 4, item 11). */}
        <Text style={styles.termsFine}>Self-reported by the parties. Not a legal document.</Text>
        <Text style={styles.amount}>{deal.terms.amountKes > 0 ? formatKes(deal.terms.amountKes) : 'Amount not set yet'}</Text>
        <View style={styles.termFacts}>
          <View style={styles.termFact}>
            <Text style={styles.termFactLabel}>Instrument</Text>
            <Text style={styles.termFactValue}>{INSTRUMENT[deal.terms.instrument] ?? 'Not set yet'}</Text>
          </View>
          {deal.terms.equityPercent != null ? (
            <View style={styles.termFact}>
              <Text style={styles.termFactLabel}>Equity</Text>
              <Text style={styles.termFactValue}>{deal.terms.equityPercent}% of the company</Text>
            </View>
          ) : null}
        </View>
        {deal.terms.roles ? <Text style={styles.termNote}>Roles: {deal.terms.roles}</Text> : null}
        {deal.terms.notes ? <Text style={styles.termNote}>{deal.terms.notes}</Text> : null}
        <View style={styles.termsRule} />
        <Text style={styles.moneyText}>The money moves between the parties through their bank, never through FoundersLink.</Text>
      </View>

      {showDiligence ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due diligence</Text>

          {atDueDiligence && required.length > 0 ? (
            <Card style={styles.group}>
              <Text style={styles.groupTitle}>Documents this deal asks of you</Text>
              {required.map((doc, i) => (
                <View key={doc.type} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{doc.title}</Text>
                    <Text style={styles.rowMeta}>
                      {doc.confirmed ? 'Confirmed by FoundersLink' : doc.provided ? 'Shared' : 'Not shared yet'}
                    </Text>
                  </View>
                  <Badge label={doc.provided ? 'Done' : 'Not yet'} variant={doc.provided ? 'success' : 'muted'} />
                  {/* A confirmed copy stays; anything else can be replaced with a new copy. */}
                  {doc.confirmed ? null : (
                    <Button
                      size="sm"
                      variant={doc.provided ? 'secondary' : 'primary'}
                      title={busy === doc.type ? 'Sharing' : doc.provided ? 'Replace' : 'Upload'}
                      accessibilityLabel={doc.provided ? `Replace ${doc.title}` : `Upload ${doc.title}`}
                      disabled={busy !== null}
                      onPress={() =>
                        void run(
                          doc.type,
                          () => dealService.uploadDocument(deal.id, doc.type),
                          // Closing the file picker without choosing shares nothing. A new
                          // copy replaces the earlier one, so look for a new document,
                          // not a longer list.
                          (after) =>
                            after.documents.some((d) => !deal.documents.some((before) => before.id === d.id))
                              ? doc.provided
                                ? `New copy of ${doc.title} shared. It replaces the earlier one.`
                                : `${doc.title} shared in this deal`
                              : null,
                        )
                      }
                    />
                  )}
                </View>
              ))}
            </Card>
          ) : null}

          {missing.length > 0 ? (
            <View style={styles.needed}>
              <Text style={styles.neededLabel}>Still needed</Text>
              {missing.map((line) => (
                <View key={line} style={styles.neededRow}>
                  <View style={[styles.bullet, styles.bulletGold]} />
                  <Text style={styles.neededText}>{line}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Terms wait for a person at FoundersLink to confirm what was shared (TEAM_DECISIONS D12). */}
          {awaiting.length > 0 ? (
            <View style={styles.awaitingBox}>
              <Text style={styles.awaitingLabel}>Waiting for FoundersLink to check</Text>
              <Text style={styles.neededText}>Terms can be agreed once these are confirmed. You do not need to do anything.</Text>
              {awaiting.map((line) => (
                <View key={line} style={styles.neededRow}>
                  <Text style={styles.neededText}>{line}</Text>
                  <Badge label="Waiting" variant="warning" />
                </View>
              ))}
            </View>
          ) : null}

          <Card style={styles.group}>
            <Text style={styles.groupTitle}>Shared in this deal</Text>
            {deal.documents.length === 0 ? (
              <Text style={styles.emptyLine}>Nothing has been shared yet. Documents appear here for every party as they are uploaded.</Text>
            ) : null}
            {deal.documents.map((d, i) => {
              const state = documentState(d);
              const { title, owner } = splitName(d.name);
              const rejected = state.variant === 'error';
              const note = d.summary?.replace(REJECTED, '').trim();
              return (
                <View key={d.id} style={[styles.doc, i > 0 && styles.rowDivider]}>
                  <View style={styles.docHead}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{title}</Text>
                      {owner ? <Text style={styles.rowMeta}>Shared by {owner}</Text> : null}
                    </View>
                    <Badge label={state.label} variant={state.variant} />
                  </View>
                  {rejected ? (
                    <View style={styles.rejected}>
                      <Text style={styles.rejectedText}>{note ? `Reason: ${note}` : 'FoundersLink did not accept this document.'}</Text>
                      <Text style={styles.rejectedHint}>Use Replace above to share a corrected copy.</Text>
                    </View>
                  ) : note ? (
                    <Text style={styles.rowMeta}>{note}</Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {deal.stage !== 'exploring' && deal.confirmations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who has confirmed the terms</Text>
          <Card style={styles.group}>
            {deal.confirmations.map((c, i) => (
              <View key={c.userId} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Avatar name={c.name} size={36} ring={false} />
                <Text style={[styles.rowTitle, styles.flex]}>
                  {c.name}
                  {c.userId === me ? ' (you)' : ''}
                </Text>
                {c.confirmed ? <Badge label="Confirmed" variant="success" /> : <Badge label="Waiting" variant="warning" />}
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {deal.stage === 'documents_compliance' && deal.checklist.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, styles.flex]}>Compliance checklist</Text>
            <Badge label={`${checklistDone} of ${deal.checklist.length} done`} variant={checklistDone === deal.checklist.length ? 'success' : 'muted'} />
          </View>
          <Card style={styles.group}>
            {deal.checklist.map((item, i) => (
              <View key={item.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={[styles.rowBody, styles.flex, item.done && { color: colors.textMuted }]}>{item.label}</Text>
                <Badge label={item.done ? 'Done' : 'Not yet'} variant={item.done ? 'success' : 'muted'} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {action ? (
        <View style={styles.action}>
          <Button title={action.title} loading={busy === 'main'} disabled={busy !== null} onPress={action.onPress} />
          <Text style={styles.actionHelp}>{action.help}</Text>
        </View>
      ) : atDueDiligence && iConfirmed ? (
        <View style={styles.waiting}>
          <Badge label="Waiting" variant="warning" />
          <Text style={styles.waitingText}>
            You have confirmed the terms.{' '}
            {waitingOn.length > 0 ? `Waiting for ${waitingOn.join(' and ')} to confirm.` : 'The deal moves on shortly.'}
          </Text>
        </View>
      ) : null}

      {deal.timeline.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <Card>
            {deal.timeline.map((event, i) => (
              <View key={event.id} style={styles.event}>
                <View style={styles.eventRail}>
                  <View style={[styles.bullet, i === 0 && styles.bulletPurple]} />
                  {i < deal.timeline.length - 1 ? <View style={styles.eventLine} /> : null}
                </View>
                <View style={[styles.eventWords, i === deal.timeline.length - 1 && styles.eventWordsLast]}>
                  <Text style={styles.rowBody}>{event.title}</Text>
                  <Text style={styles.eventTime}>{when(event.at)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[2] },
  flex: { flex: 1, minWidth: 0 },

  head: { gap: spacing[1], marginTop: spacing[0.5] },
  title: { fontSize: 28, lineHeight: 34, color: colors.primaryDark },
  withRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  withText: { fontSize: 14, color: colors.textMuted },

  card: { gap: spacing[1.5] },
  label: { fontSize: 12, color: colors.textMuted },

  // The one deep purple block on the screen: the money.
  terms: { backgroundColor: colors.primaryDark, borderRadius: radius.card, padding: 22, gap: spacing[1] },
  termsLabel: { fontSize: 12, color: colors.onDarkMuted },
  termsFine: { fontSize: 12, color: colors.onDarkDim },
  amount: { fontSize: 34, lineHeight: 40, color: colors.white, marginTop: spacing[0.5] },
  termFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[0.5] },
  termFact: { gap: 2 },
  termFactLabel: { fontSize: 12, color: colors.onDarkDim },
  termFactValue: { fontSize: 15, fontWeight: '500', color: colors.white },
  termNote: { fontSize: 14, color: colors.onDarkMuted },
  termsRule: { height: 1, backgroundColor: colors.onDarkLine, marginTop: spacing[1] },
  moneyText: { fontSize: 13, color: colors.onDarkMuted },

  section: { gap: spacing[1.5] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sectionTitle: { fontSize: 20, fontWeight: '500', color: colors.primaryDark },
  group: { gap: 0, paddingVertical: spacing[1] },
  groupTitle: { fontSize: 12, color: colors.textMuted, paddingVertical: spacing[1] },
  emptyLine: { fontSize: 14, color: colors.textMuted, paddingBottom: spacing[1] },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[1.5], minHeight: 56 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowBody: { fontSize: 15, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 1 },

  // Still needed: gold-tinted, the one place gold carries a message.
  needed: { backgroundColor: colors.accentLight, borderRadius: radius.card, padding: 18, gap: spacing[1] },
  neededLabel: { fontSize: 12, fontWeight: '600', color: colors.accentText },
  awaitingBox: { backgroundColor: colors.primaryLight, borderRadius: radius.card, padding: 18, gap: spacing[1] },
  awaitingLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  neededRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  neededText: { flex: 1, fontSize: 14, color: colors.text },
  bullet: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.grey300 },
  bulletGold: { backgroundColor: colors.accent },
  bulletPurple: { backgroundColor: colors.primary },

  doc: { paddingVertical: spacing[1.5], gap: spacing[1] },
  docHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5] },
  rejected: { backgroundColor: colors.errorLight, borderRadius: radius.md, padding: spacing[1.5], gap: 4 },
  rejectedText: { fontSize: 14, fontWeight: '500', color: colors.error },
  rejectedHint: { fontSize: 14, color: colors.text },

  action: { gap: spacing[1], marginTop: spacing[1] },
  actionHelp: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  waiting: { gap: spacing[1], backgroundColor: colors.primaryLight, borderRadius: radius.card, padding: 18 },
  waitingText: { fontSize: 14, color: colors.primaryDark },

  closed: { gap: spacing[1], backgroundColor: colors.successLight, borderRadius: radius.card, padding: 18 },
  closedTitle: { fontSize: 17, fontWeight: '500', color: colors.text },
  closedCopy: { fontSize: 14, color: colors.text },

  event: { flexDirection: 'row', gap: spacing[1.5] },
  eventRail: { width: 12, alignItems: 'center', paddingTop: 7 },
  eventLine: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 4 },
  eventWords: { flex: 1, paddingBottom: spacing[2], gap: 2 },
  eventWordsLast: { paddingBottom: 0 },
  eventTime: { fontSize: 12, color: colors.textMuted },
});
