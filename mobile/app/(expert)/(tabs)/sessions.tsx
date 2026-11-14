import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/ui';
import { useToast } from '../../../src/components/ui/Toast';
import { Text } from '../../../src/components/ui/Text';
import { Column, Columns, Empty, Greeting, Panel, Row, Stat, Stats, Tag } from '../../../src/components/overview/parts';
import { greeting } from '../../../src/components/layout/workspace';
import { expertService, type ExpertSession } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh';
import { useWideLayout } from '../../../src/hooks/useWideLayout';
import { verificationInvite } from '../../../src/lib/verification-invite';
import { colors, radius, spacing } from '../../../src/theme/tokens';

const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
};

/**
 * The expert's home: founders who asked for help, the sessions she is
 * running, and how many founders she has helped.
 */
export default function ExpertOverview() {
  const router = useRouter();
  const wide = useWideLayout();
  const { show } = useToast();
  const user = useAuthStore((s) => s.user);
  const first = (user?.fullName ?? '').split(' ')[0];
  const approved = user?.approvalStatus === 'approved';
  const invite = verificationInvite(user?.approvalStatus, 'expert');
  const [busy, setBusy] = useState<string | null>(null);

  // Session requests reach an expert only once she is approved.
  const q = useQuery({ queryKey: ['expert-sessions'], queryFn: () => expertService.listSessions(), enabled: approved, refetchInterval: 15000 });
  const pull = usePullToRefresh(q.refetch);
  const sessions = q.data ?? [];
  const asked = sessions.filter((s) => s.status === 'requested');
  const running = sessions.filter((s) => s.status === 'accepted');
  const helped = new Set(sessions.filter((s) => s.status === 'done').map((s) => s.with.id)).size;

  const answer = async (s: ExpertSession, status: 'accepted' | 'declined' | 'done') => {
    setBusy(s.id + status);
    try {
      await expertService.answer(s.id, status);
      await q.refetch();
      show(status === 'accepted' ? `Accepted. Message ${s.with.full_name} to agree a time.` : status === 'done' ? 'Marked as done. Thank you for helping.' : 'Declined.', 'success');
    } catch (e) {
      show((e as { message?: string })?.message ?? 'That did not save. Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl {...pull} />}>
      <Greeting
        hello={`${greeting()},`}
        name={first}
        line={approved ? 'Founders who asked for your help, and the sessions you are running.' : 'Once you are verified, founders can find you and ask for a session.'}
        actions={
          wide ? (
            approved ? (
              <Button title="Open messages" size="sm" variant="secondary" onPress={() => router.push('/conversations')} />
            ) : (
              <Button title={invite?.button ?? 'Verify'} size="sm" onPress={() => router.push((invite?.route ?? '/founder/verify') as never)} />
            )
          ) : undefined
        }
      />

      <Stats>
        <Stat label="New requests" value={String(asked.length)} note={asked.length ? 'Waiting for your answer' : 'None waiting'} />
        <Stat label="Sessions running" value={String(running.length)} note={running.length ? 'Agree a time in Messages' : 'None right now'} />
        <Stat label="Founders helped" value={String(helped)} note={helped ? 'Thank you' : 'Your first is coming'} />
      </Stats>

      {!approved ? (
        <Panel title={invite?.title ?? 'Verify to start helping'} sub={invite?.text}>
          <Row title="Verification" line="A person at FoundersLink checks every expert, including your professional register entry." right={<Tag label="First" tone="new" />} onPress={() => router.push((invite?.route ?? '/founder/verify') as never)} last />
          <Button title={invite?.button ?? 'Verify'} onPress={() => router.push((invite?.route ?? '/founder/verify') as never)} style={styles.start} />
        </Panel>
      ) : (
        <Columns>
          <Column wide>
            <Panel title="Founders asking for help" sub="Accept to start, then agree a time in Messages.">
              {q.isLoading ? (
                <Empty text="Loading your requests…" />
              ) : q.isError ? (
                <View style={styles.error}>
                  <Text style={styles.errorText}>Your requests did not load. Check your connection.</Text>
                  <Button title="Try again" variant="secondary" onPress={() => void q.refetch()} />
                </View>
              ) : asked.length === 0 ? (
                <Empty text="No new requests. Founders who need your help will appear here." />
              ) : (
                asked.map((s) => (
                  <View key={s.id} style={styles.request}>
                    <Row person={s.with.full_name} title={s.with.full_name} line={when(s.created_at)} right={<Tag label="New" tone="new" />} last />
                    <Text style={styles.topic}>“{s.topic}”</Text>
                    <View style={styles.actions}>
                      <Button title="Accept" loading={busy === s.id + 'accepted'} disabled={busy !== null} onPress={() => void answer(s, 'accepted')} style={styles.flex} />
                      <Button title="Decline" variant="secondary" loading={busy === s.id + 'declined'} disabled={busy !== null} onPress={() => void answer(s, 'declined')} style={styles.flex} />
                    </View>
                  </View>
                ))
              )}
            </Panel>
          </Column>
          <Column>
            <Panel title="Sessions running" sub="Mark one done when you have helped.">
              {running.length === 0 ? (
                <Empty text="No sessions running." />
              ) : (
                running.map((s, i) => (
                  <View key={s.id} style={styles.running}>
                    <Row person={s.with.full_name} title={s.with.full_name} line={s.topic} last={i === running.length - 1} />
                    <Button title="Mark as done" variant="secondary" loading={busy === s.id + 'done'} disabled={busy !== null} onPress={() => void answer(s, 'done')} />
                  </View>
                ))
              )}
            </Panel>
          </Column>
        </Columns>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[1.5] },
  start: { alignSelf: 'flex-start', marginTop: spacing[1] },
  request: { gap: spacing[1], paddingBottom: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  topic: { fontSize: 15, color: colors.text, backgroundColor: colors.grey100, padding: spacing[1.5], borderRadius: radius.sm },
  actions: { flexDirection: 'row', gap: spacing[1] },
  running: { gap: spacing[1], paddingBottom: spacing[1] },
  error: { gap: spacing[1] },
  errorText: { fontSize: 14, color: colors.textMuted },
});
