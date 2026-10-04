import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LogOut, MessageCircle, Settings, ShieldCheck } from 'lucide-react-native';
import { Text } from '../../../src/components/ui/Text';
import { Badge, Button, Card, ConfirmModal } from '../../../src/components/ui';
import { MenuGroup, MenuRow } from '../../../src/components/profile/MenuRow';
import { Chip } from '../../../src/components/matches/parts';
import { investorService, referenceDataService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
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
    case 'suspended':
    case 'banned':
      return { label: 'Account on hold', variant: 'error', state: 'held' };
    default:
      return { label: 'Not verified yet', variant: 'muted', state: 'none' };
  }
}

const KIND_WORDS: Record<string, string> = {
  angel: 'Angel investor',
  vc: 'Venture capital fund',
  accelerator: 'Accelerator',
};

function tidy(id: string): string {
  const spaced = id.replace(/_/g, ' ');
  if (spaced.toLowerCase() === 'mvp') return 'MVP';
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

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.chipBlock}>
      <Text style={styles.factLabel}>{label}</Text>
      <View style={styles.chips}>
        {items.map((item) => (
          <Chip key={item} label={item} />
        ))}
      </View>
    </View>
  );
}

export default function InvestorProfileTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setupQ = useQuery({ queryKey: ['investor-setup'], queryFn: () => investorService.getSetup() });
  const metaQ = useQuery({ queryKey: ['meta-options'], queryFn: () => referenceDataService.getMetaOptions(), staleTime: Infinity });

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const v = verification(user?.approvalStatus);
  const setup = setupQ.data;
  const labels = ((metaQ.data as { labels?: Record<string, string> } | undefined)?.labels ?? {}) as Record<string, string>;
  const labelOf = (id: string) => labels[id] ?? tidy(id);

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
        <Text style={styles.sectionTitle}>What you fund</Text>
        {setupQ.isLoading ? (
          <Card>
            <Text style={styles.muted}>Loading what you fund...</Text>
          </Card>
        ) : setupQ.isError ? (
          <Card style={styles.cardGap}>
            <Text style={styles.muted}>We couldn't load what you fund. Check your connection and try again.</Text>
            <Button title="Try again" variant="secondary" onPress={() => void setupQ.refetch()} />
          </Card>
        ) : setup ? (
          <Card style={styles.cardGap}>
            <View>
              <Text style={styles.cardTitle}>{setup.organisationName}</Text>
              <Text style={styles.muted}>
                {KIND_WORDS[setup.kind] ?? tidy(setup.kind)}
                {setup.jobTitle ? `, ${setup.jobTitle}` : ''}
              </Text>
            </View>
            <View>
              <Text style={styles.factLabel}>Ticket size</Text>
              <Text style={styles.ticket}>
                {ksh(setup.ticketMinKes)} to {ksh(setup.ticketMaxKes)}
              </Text>
            </View>
            <ChipRow label="Sectors" items={setup.sectors.map(labelOf)} />
            <ChipRow label="Stages" items={setup.stages.map(labelOf)} />
            <ChipRow label="How you invest" items={setup.instruments.map(labelOf)} />
            <ChipRow label="Where" items={setup.counties.length ? setup.counties.map(labelOf) : ['Anywhere in Kenya']} />
            {setup.mandateText ? (
              <View style={styles.words}>
                <Text style={styles.factLabel}>In your words</Text>
                <Text style={styles.mandate}>{setup.mandateText}</Text>
              </View>
            ) : null}
            <Button title="Edit what I fund" variant="secondary" onPress={() => router.push('/investor/onboarding')} />
          </Card>
        ) : (
          <Card style={styles.cardGap}>
            <Text style={styles.cardTitle}>Tell us what you fund</Text>
            <Text style={styles.muted}>Founders are matched to you from your sectors, stages and ticket size.</Text>
            <Button title="Say what I fund" onPress={() => router.push('/investor/onboarding')} />
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification</Text>
        {v.state === 'approved' ? (
          <View style={styles.verified}>
            <ShieldCheck size={20} color={colors.success} />
            <Text style={styles.verifiedText}>You're verified. You can connect and chat with founders.</Text>
          </View>
        ) : (
          <Card style={styles.cardGap}>
            <Text style={styles.cardTitle}>
              {v.state === 'checking'
                ? "We're checking your details"
                : v.state === 'needs_info'
                  ? 'We need a little more from you'
                  : v.state === 'held'
                    ? 'Your account is on hold'
                    : 'Verify to connect'}
            </Text>
            <Text style={styles.muted}>
              {v.state === 'checking'
                ? 'Founders\' names, connections and chat open as soon as FoundersLink approves you. You can keep exploring Discover.'
                : v.state === 'needs_info'
                  ? 'Open your status to see what is missing and send it.'
                  : v.state === 'held'
                    ? 'Open your status to see why, and what you can do.'
                    : 'Everyone you meet here has been checked. Verify once, and you can see who the founders are, ask them to connect and chat with them.'}
            </Text>
            {v.state === 'none' && user?.approvalStatus !== 'rejected' ? (
              <Button title="Verify to connect" onPress={() => router.push('/founder/verify')} />
            ) : (
              <Button title="See status" variant="secondary" onPress={() => router.push('/founder/verify/status')} />
            )}
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
  screen: { backgroundColor: colors.white },
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
  headText: { flex: 1, gap: spacing[0.5], alignItems: 'flex-start' },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  email: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: spacing[0.5] },
  section: { gap: spacing[1] },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  cardGap: { gap: spacing[1.5] },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  factLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  ticket: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
  chipBlock: { gap: spacing[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  words: { gap: spacing[0.5], paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  mandate: { fontSize: 16, fontWeight: '500', color: colors.text },
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
