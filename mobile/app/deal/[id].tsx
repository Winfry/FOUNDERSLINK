import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, CircleAlert, CircleCheck, CircleDashed, Clock, FileText, Info, Landmark, Upload } from 'lucide-react-native';
import { Text } from '../../src/components/ui/Text';
import { Avatar, Badge, Button, Card } from '../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { useToast } from '../../src/components/ui/Toast';
import { StageStepper, stageLabel } from '../../src/components/deal/StageStepper';
import { dealService } from '../../src/services';
import { formatKes } from '../../src/services/mocks/kenya-data';
import { useAuthStore } from '../../src/stores/authStore';
import type { Deal, DealDocument, Instrument } from '../../src/types';
import { colors, spacing, touchTargetMin } from '../../src/theme/tokens';

const INSTRUMENT: Record<Instrument, string> = {
  equity: 'Equity',
  convertible_note: 'Convertible note',
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
  const atDueDiligence = deal.stage === 'due_diligence';
  const isClosed = deal.stage === 'closed' || deal.stage === 'active';
  const showDiligence = atDueDiligence || deal.documents.length > 0;
  const iConfirmed = deal.confirmations.some((c) => c.userId === me && c.confirmed);
  const waitingOn = deal.confirmations.filter((c) => !c.confirmed && c.userId !== me).map((c) => c.name);
  const checklistDone = deal.checklist.filter((c) => c.done).length;
  // Her own copy of a document that staff have not looked at yet: the
  // one "Replace" swaps out. A reviewed copy stays on the record.
  const replaceable = (type: string) =>
    deal.documents.find((d) => d.ownerUserId === me && d.type === type && d.status === 'uploaded')?.id;
  // A rejected document has been answered once a later copy of the same
  // kind from the same person is in the list (the list is oldest first).
  const superseded = (d: DealDocument, at: number) =>
    deal.documents.some((o, j) => j > at && o.type !== undefined && o.type === d.type && o.ownerUserId === d.ownerUserId && o.status !== 'rejected');
  const otherRole = deal.withRole === 'founder' || deal.withRole === 'investor' ? `the ${deal.withRole}` : (deal.withName || 'the other party');

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
                onPress: () => void run('main', () => dealService.advanceStage(deal.id), moved),
              }
            : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.title}>{deal.title}</Text>
        {deal.withName ? (
          <View style={styles.withRow}>
            <Avatar name={deal.withName} size={28} />
            <Text style={styles.withText}>With {deal.withName}</Text>
          </View>
        ) : null}
      </View>

      <Card>
        <StageStepper stage={deal.stage} />
      </Card>

      {isClosed ? (
        <View style={styles.closed}>
          <View style={styles.closedIcon}>
            <Landmark size={20} color={colors.success} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.closedTitle}>This deal is closed</Text>
            <Text style={styles.closedCopy}>
              The money moves between you and {otherRole} through a bank. FoundersLink records the deal.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.terms}>
        <Text style={styles.termsLabel}>Terms</Text>
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
      </View>

      {deal.notice ? (
        <View style={styles.notice}>
          <Info size={16} color={colors.textMuted} style={styles.noticeIcon} />
          <Text style={styles.noticeText}>{deal.notice}</Text>
        </View>
      ) : null}

      {showDiligence ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due diligence</Text>

          {atDueDiligence && required.length > 0 ? (
            <Card style={styles.group}>
              <Text style={styles.groupTitle}>Documents this deal asks of you</Text>
              {required.map((doc, i) => (
                <View key={doc.type} style={[styles.row, i > 0 && styles.rowDivider]}>
                  {doc.provided ? <CircleCheck size={22} color={colors.success} /> : <CircleDashed size={22} color={colors.textMuted} />}
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{doc.title}</Text>
                    <Text style={[styles.rowMeta, doc.provided && { color: colors.success }]}>
                      {doc.provided ? 'Shared' : 'Not shared yet'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={doc.provided ? `Replace ${doc.title}` : `Upload ${doc.title}`}
                    disabled={busy !== null}
                    onPress={() =>
                      void run(
                        doc.type,
                        () => dealService.uploadDocument(deal.id, doc.type, replaceable(doc.type)),
                        // Closing the file picker without choosing shares nothing,
                        // and then the list is the same documents as before.
                        (after) => {
                          const before = new Set(deal.documents.map((d) => d.id));
                          if (!after.documents.some((d) => !before.has(d.id))) return null;
                          return after.documents.length > deal.documents.length
                            ? `${doc.title} shared in this deal`
                            : `${doc.title} replaced with your new copy`;
                        },
                      )
                    }
                    style={({ pressed }) => [styles.upload, pressed && styles.uploadPressed, busy !== null && styles.dim]}
                  >
                    <Upload size={16} color={colors.primary} />
                    <Text style={styles.uploadText}>{busy === doc.type ? 'Sharing' : doc.provided ? 'Replace' : 'Upload'}</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : null}

          {missing.length > 0 ? (
            <View style={styles.needed}>
              <Text style={styles.neededTitle}>Still needed</Text>
              {missing.map((line) => (
                <View key={line} style={styles.neededRow}>
                  <CircleAlert size={16} color={colors.warning} style={styles.neededIcon} />
                  <Text style={styles.neededText}>{line}</Text>
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
                    <FileText size={20} color={colors.textMuted} style={styles.docIcon} />
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{title}</Text>
                      {owner ? <Text style={styles.rowMeta}>Shared by {owner}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.docBody}>
                    <Badge label={state.label} variant={state.variant} />
                    {rejected ? (
                      <View style={styles.rejected}>
                        <Text style={styles.rejectedText}>
                          {note ? `Reason: ${note}` : 'FoundersLink did not accept this document.'}
                        </Text>
                        <Text style={styles.rejectedHint}>
                          {superseded(d, i) ? 'A newer copy has been shared since.' : 'Share a corrected copy to continue.'}
                        </Text>
                      </View>
                    ) : note ? (
                      <Text style={styles.rowMeta}>{note}</Text>
                    ) : null}
                  </View>
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
                <Avatar name={c.name} size={36} />
                <Text style={[styles.rowTitle, styles.flex]}>
                  {c.name}
                  {c.userId === me ? ' (you)' : ''}
                </Text>
                {c.confirmed ? (
                  <View style={styles.state}>
                    <Check size={16} color={colors.success} strokeWidth={3} />
                    <Text style={[styles.stateText, { color: colors.success }]}>Confirmed</Text>
                  </View>
                ) : (
                  <View style={styles.state}>
                    <Clock size={16} color={colors.textMuted} />
                    <Text style={styles.stateText}>Waiting</Text>
                  </View>
                )}
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
                {item.done ? <CircleCheck size={22} color={colors.success} /> : <CircleDashed size={22} color={colors.textMuted} />}
                <Text style={[styles.rowBody, styles.flex, item.done && { color: colors.textMuted }]}>{item.label}</Text>
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
          <Clock size={20} color={colors.primaryDark} />
          <Text style={styles.waitingText}>
            You have confirmed the terms.{' '}
            {waitingOn.length > 0 ? `Waiting for ${waitingOn.join(' and ')} to confirm.` : 'The deal moves on shortly.'}
          </Text>
        </View>
      ) : null}

      {deal.timeline.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View>
            {deal.timeline.map((event, i) => (
              <View key={event.id} style={styles.event}>
                <View style={styles.eventRail}>
                  <View style={styles.eventDot} />
                  {i < deal.timeline.length - 1 ? <View style={styles.eventLine} /> : null}
                </View>
                <View style={styles.eventWords}>
                  <Text style={styles.rowBody}>{event.title}</Text>
                  <Text style={styles.eventTime}>{when(event.at)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[3] },
  flex: { flex: 1 },
  dim: { opacity: 0.5 },

  head: { gap: spacing[1] },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  withRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  withText: { fontSize: 14, color: colors.textMuted },

  // The one bold block on the screen: the money.
  terms: { backgroundColor: colors.primaryDark, borderRadius: 16, padding: spacing[2], gap: spacing[1] },
  termsLabel: { fontSize: 14, fontWeight: '600', color: '#C7D7F5' },
  amount: { fontSize: 32, fontWeight: '800', color: colors.white },
  termFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[0.5] },
  termFact: { gap: 2 },
  termFactLabel: { fontSize: 12, fontWeight: '600', color: '#C7D7F5' },
  termFactValue: { fontSize: 16, fontWeight: '700', color: colors.white },
  termNote: { fontSize: 14, color: '#E3EBFA' },

  // Sits right under the terms block it explains.
  notice: { flexDirection: 'row', gap: spacing[1], marginTop: -spacing[1.5] },
  noticeIcon: { marginTop: 2 },
  noticeText: { flex: 1, fontSize: 14, color: colors.textMuted },

  section: { gap: spacing[1.5] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  group: { gap: 0, paddingVertical: spacing[1] },
  groupTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, paddingVertical: spacing[1] },
  emptyLine: { fontSize: 14, color: colors.textMuted, paddingBottom: spacing[1] },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[1.5], minHeight: 56 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowBody: { fontSize: 16, color: colors.text },
  rowMeta: { fontSize: 14, color: colors.textMuted },

  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    minHeight: touchTargetMin,
    paddingHorizontal: spacing[1.5],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  uploadPressed: { backgroundColor: colors.primaryLight, transform: [{ scale: 0.97 }] },
  uploadText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  needed: { backgroundColor: colors.warningLight, borderRadius: 16, padding: spacing[2], gap: spacing[1] },
  neededTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  neededRow: { flexDirection: 'row', gap: spacing[1] },
  neededIcon: { marginTop: 2 },
  neededText: { flex: 1, fontSize: 14, color: colors.text },

  doc: { paddingVertical: spacing[1.5], gap: spacing[1] },
  docHead: { flexDirection: 'row', gap: spacing[1.5] },
  docIcon: { marginTop: 2 },
  docBody: { marginLeft: 20 + spacing[1.5], gap: spacing[1] },
  rejected: { backgroundColor: colors.errorLight, borderRadius: 12, padding: spacing[1.5], gap: 4 },
  rejectedText: { fontSize: 14, fontWeight: '600', color: colors.error },
  rejectedHint: { fontSize: 14, color: colors.text },

  state: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  stateText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

  action: { gap: spacing[1], marginTop: spacing[1] },
  actionHelp: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: spacing[2],
  },
  waitingText: { flex: 1, fontSize: 14, color: colors.primaryDark },

  closed: {
    flexDirection: 'row',
    gap: spacing[1.5],
    backgroundColor: colors.successLight,
    borderRadius: 16,
    padding: spacing[2],
  },
  closedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  closedCopy: { fontSize: 14, color: colors.text, marginTop: 4 },

  event: { flexDirection: 'row', gap: spacing[1.5] },
  eventRail: { width: 12, alignItems: 'center', paddingTop: 8 },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grey300 },
  eventLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  eventWords: { flex: 1, paddingBottom: spacing[2], gap: 2 },
  eventTime: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
});
