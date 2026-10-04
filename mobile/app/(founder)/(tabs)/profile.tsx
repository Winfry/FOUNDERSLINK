import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LogOut, MessageCircle, Settings, ShieldCheck } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button, Card, ConfirmModal } from '../../../src/components/ui';
import { MenuGroup, MenuRow } from '../../../src/components/profile/MenuRow';
import { founderService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { verificationWords } from '../../../src/lib/verification-state';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import type { ApprovalStatus } from '../../../src/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted';

/** Her verification state in words, and what the card under it should offer. */
function verification(status: ApprovalStatus | undefined): {
  label: string;
  variant: BadgeVariant;
  state: 'none' | 'checking' | 'needs_info' | 'approved' | 'held';
} {
  switch (status) {
    case 'approved':
      return { label: 'Verified member', variant: 'success', state: 'approved' };
    case 'submitted':
    case 'in_review':
      return { label: 'Being checked', variant: 'default', state: 'checking' };
    case 'needs_info':
      return { label: 'More information needed', variant: 'warning', state: 'needs_info' };
    case 'rejected':
      return { label: 'Not approved', variant: 'error', state: 'held' };
    case 'suspended':
    case 'banned':
      return { label: 'Account paused', variant: 'error', state: 'held' };
    default:
      return { label: 'Not verified yet', variant: 'muted', state: 'none' };
  }
}

// Words for the ids the backend sends.
const WORDS: Record<string, string> = {
  idea: 'Idea',
  mvp: 'MVP',
  early_revenue: 'Early revenue',
  growth: 'Growth',
  informal: 'Informal business',
  registered_business_name: 'Registered business name',
  limited_company: 'Limited company',
  agri: 'Agriculture',
};

function words(id: string | undefined): string {
  if (!id) return '';
  if (WORDS[id]) return WORDS[id];
  const spaced = id.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function ksh(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function FounderProfileTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const profileQ = useQuery({ queryKey: ['founder-profile'], queryFn: () => founderService.getProfile() });

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const v = verification(user?.approvalStatus);
  const vw = verificationWords(user?.approvalStatus, 'founder');
  const profile = profileQ.data;
  const complete = Math.max(0, Math.min(100, Math.round(profile?.profileCompleteness ?? 0)));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.fullName ?? '')}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Badge label={v.label} variant={v.variant} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your business</Text>
        {profileQ.isLoading ? (
          <Card>
            <Text style={styles.muted}>Loading your business...</Text>
          </Card>
        ) : profileQ.isError ? (
          <Card style={styles.cardGap}>
            <Text style={styles.muted}>We couldn't load your business details. Check your connection and try again.</Text>
            <Button title="Try again" variant="secondary" onPress={() => void profileQ.refetch()} />
          </Card>
        ) : profile ? (
          <Card style={styles.cardGap}>
            <Text style={styles.cardTitle}>{profile.businessName || 'Your business'}</Text>
            <View style={styles.facts}>
              {profile.sector ? <Fact label="Sector" value={words(profile.sector)} /> : null}
              <Fact label="Stage" value={words(profile.stage)} />
              {profile.county ? <Fact label="County" value={profile.county} /> : null}
              {profile.businessStatus ? <Fact label="Registered as" value={words(profile.businessStatus)} /> : null}
              {profile.fundingAmountKes > 0 ? <Fact label="Looking to raise" value={ksh(profile.fundingAmountKes)} /> : null}
            </View>
            <View style={styles.progress}>
              <Text style={styles.progressLabel}>Profile {complete}% complete</Text>
              <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: complete }}>
                <View style={[styles.fill, { width: `${complete}%` }]} />
              </View>
            </View>
            <Button title="Edit my business" variant="secondary" onPress={() => router.push('/founder/onboarding')} />
          </Card>
        ) : (
          <Card style={styles.cardGap}>
            <Text style={styles.cardTitle}>Tell us about your business</Text>
            <Text style={styles.muted}>Investors are matched to you from your business details.</Text>
            <Button title="Describe my business" onPress={() => router.push('/founder/onboarding')} />
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification</Text>
        {v.state === 'approved' ? (
          <View style={styles.verified}>
            <ShieldCheck size={20} color={colors.success} />
            <Text style={styles.verifiedText}>You're verified. You can connect and chat with investors.</Text>
          </View>
        ) : (
          <Card style={styles.cardGap}>
            <Text style={styles.cardTitle}>{vw.title}</Text>
            <Text style={styles.muted}>{vw.body}</Text>
            <Button title={vw.action} variant={vw.starts ? 'primary' : 'secondary'} onPress={() => router.push(vw.href)} />
          </Card>
        )}
      </View>

      <MenuGroup>
        <MenuRow icon={MessageCircle} label="Messages" onPress={() => router.push('/conversations')} />
        <MenuRow icon={Settings} label="Settings" onPress={() => router.push('/settings')} last />
      </MenuGroup>

      <MenuGroup>
        <MenuRow icon={LogOut} label="Log out" destructive onPress={() => setConfirmingLogout(true)} last />
      </MenuGroup>

      <ConfirmModal
        visible={confirmingLogout}
        title="Log out?"
        message="You will need your email and password to come back in."
        confirmLabel="Log out"
        cancelLabel="Stay"
        destructive
        loading={loggingOut}
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => {
          setLoggingOut(true);
          void logout().then(() => router.replace('/auth/login'));
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: 'transparent' },
  wrap: { padding: spacing[2], paddingBottom: spacing[4], gap: spacing[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.white },
  headText: { flex: 1, gap: spacing[0.5] },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  email: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: spacing[0.5] },
  section: { gap: spacing[1] },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  cardGap: { gap: spacing[1.5] },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  facts: { gap: spacing[1] },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2] },
  factLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  factValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  progress: { gap: spacing[1], paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  progressLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.accentLight, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.accent },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    padding: spacing[2],
    borderRadius: radius.card,
    backgroundColor: colors.successLight,
  },
  verifiedText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
});

export default withBackdrop(FounderProfileTab);
