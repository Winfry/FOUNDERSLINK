import { useRouter } from 'expo-router';
import { verificationInvite } from '../../src/lib/verification-invite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Badge, Button, ConfirmModal } from '../../src/components/ui';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { useToast } from '../../src/components/ui/Toast';
import { HeaderPattern } from '../../src/components/ui/HeaderPattern';
import { ScreenBackdrop } from '../../src/components/ui/ScreenBackdrop';
import { Text } from '../../src/components/ui/Text';
import { API_URL, get, patch } from '../../src/services/http/client';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';

/** `GET /me/office-hours`, as the backend sends it. */
interface Session {
  id: string;
  topic: string;
  status: 'requested' | 'accepted' | 'declined' | 'done';
  role: 'expert' | 'requester';
  with: { id: string; full_name: string };
  created_at: string;
}

const STATUS: Record<Session['status'], { label: string; variant: 'default' | 'success' | 'muted' }> = {
  requested: { label: 'New request', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'muted' },
  done: { label: 'Done', variant: 'muted' },
};

export default function ExpertHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const approved = user?.approvalStatus === 'approved';
  const waiting = user?.approvalStatus === 'submitted' || user?.approvalStatus === 'in_review';
  // The card for an expert who is not approved: its words follow her status,
  // so a rejected or paused expert is told why, not asked to verify again.
  const invite = verificationInvite(user?.approvalStatus, 'expert');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  // Until the first answer, so "No requests" never shows before they load.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { show } = useToast();

  // Session requests reach an expert only once she is approved.
  const load = useCallback(async () => {
    if (!API_URL || !approved) return;
    setLoading(true);
    try {
      const all = await get<Session[]>('/me/office-hours');
      setSessions(all.filter((s) => s.role === 'expert'));
      setLoadError(false);
    } catch {
      // Said plainly, never shown as "no requests".
      setLoadError(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [approved]);

  useEffect(() => {
    void load();
  }, [load]);

  const answer = async (id: string, status: 'accepted' | 'declined' | 'done') => {
    setBusy(id + status);
    try {
      await patch(`/office-hours/${id}`, { status });
      await load();
    } catch (e) {
      show((e as { message?: string })?.message ?? 'That did not save. Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const open = sessions.filter((s) => s.status === 'requested' || s.status === 'accepted');
  const helped = sessions.filter((s) => s.status === 'done').length;

  return (
    <ScreenBackdrop>
      <View style={[styles.bar, { paddingTop: insets.top + spacing[1.5] }]}>
        <HeaderPattern />
        <Text style={styles.brand}>FoundersLink</Text>
        <Text style={styles.barSub}>Expert</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + spacing[4] }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        <View style={styles.me}>
          <Avatar name={user?.fullName ?? 'Expert'} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Badge
              label={
                approved
                  ? 'Verified expert'
                  : waiting
                    ? 'Being reviewed'
                    : user?.approvalStatus === 'suspended' || user?.approvalStatus === 'banned'
                      ? 'Account on hold'
                      : user?.approvalStatus === 'rejected'
                        ? 'Not approved'
                        : 'Not verified yet'
              }
              variant={approved ? 'success' : 'muted'}
            />
          </View>
        </View>

        {invite ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{invite.title}</Text>
            <Text style={styles.muted}>{invite.text}</Text>
            <Button
              title={invite.button}
              variant={invite.route === '/founder/verify' ? 'primary' : 'secondary'}
              onPress={() => router.push(invite.route)}
            />
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{open.length}</Text>
                <Text style={styles.muted}>open requests</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{helped}</Text>
                <Text style={styles.muted}>founders helped</Text>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Session requests</Text>
              {/* Pulling down to refresh does not exist in a web browser. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => void load()}
                disabled={loading}
                style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.refreshText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
              </Pressable>
            </View>
            {!loaded ? (
              <SkeletonCard />
            ) : loadError ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Your requests did not load</Text>
                <Text style={styles.muted}>Check your connection, then try again.</Text>
                <Button title="Try again" variant="secondary" onPress={() => void load()} />
              </View>
            ) : open.length === 0 ? (
              <Text style={styles.muted}>No requests right now. Founders who need your help will appear here.</Text>
            ) : (
              open.map((s) => (
                <View key={s.id} style={styles.card}>
                  <View style={styles.row}>
                    <Avatar name={s.with.full_name} size={40} />
                    <Text style={[styles.cardTitle, { flex: 1 }]}>{s.with.full_name}</Text>
                    <Badge label={STATUS[s.status].label} variant={STATUS[s.status].variant} />
                  </View>
                  <Text style={styles.topic}>“{s.topic}”</Text>
                  {s.status === 'requested' ? (
                    <View style={styles.actions}>
                      <Button title="Accept" loading={busy === s.id + 'accepted'} disabled={busy !== null} onPress={() => void answer(s.id, 'accepted')} style={{ flex: 1 }} />
                      <Button title="Decline" variant="secondary" loading={busy === s.id + 'declined'} disabled={busy !== null} onPress={() => void answer(s.id, 'declined')} style={{ flex: 1 }} />
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <Button title="Message" variant="secondary" onPress={() => router.push('/conversations')} style={{ flex: 1 }} />
                      <Button title="Mark as done" loading={busy === s.id + 'done'} disabled={busy !== null} onPress={() => void answer(s.id, 'done')} style={{ flex: 1 }} />
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        <Text style={styles.section}>Your account</Text>
        <View style={styles.links}>
          <Button title="Edit expert profile" variant="secondary" onPress={() => router.push('/expert/onboarding')} />
          {approved ? <Button title="Messages" variant="secondary" onPress={() => router.push('/conversations')} /> : null}
          <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} />
          <Button title="Log out" variant="secondary" onPress={() => setConfirmingLogout(true)} />
        </View>
      </ScrollView>
      <ConfirmModal
        visible={confirmingLogout}
        title="Log out?"
        message="You will need your email and password to log in again."
        confirmLabel="Log out"
        cancelLabel="Stay"
        destructive
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => {
          setConfirmingLogout(false);
          void logout().then(() => router.replace('/auth/login'));
        }}
      />
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refresh: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[1] },
  refreshText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  bar: { paddingHorizontal: spacing[3], paddingBottom: spacing[2], flexDirection: 'row', alignItems: 'baseline', gap: spacing[1], overflow: 'hidden' },
  brand: { fontSize: 18, fontWeight: '800', color: colors.white },
  barSub: { fontSize: 14, fontWeight: '600', color: colors.accent },
  wrap: { padding: spacing[3], gap: spacing[2] },
  me: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing[0.5] },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing[2], gap: spacing[1.5] },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing[1.5] },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing[2] },
  statNum: { fontSize: 28, fontWeight: '800', color: colors.primary },
  section: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  topic: { fontSize: 15, color: colors.text, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing[1.5] },
  links: { gap: spacing[1] },
});
