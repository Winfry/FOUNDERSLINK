import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Avatar, Button, Card, ConfirmModal } from '../../../src/components/ui';
import { MenuGroup, MenuRow } from '../../../src/components/profile/MenuRow';
import { Tag, type Tone } from '../../../src/components/overview/parts';
import { PageTitle } from '../../../src/components/layout/PageTitle';
import { investorService, referenceDataService } from '../../../src/services';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing } from '../../../src/theme/tokens';
import type { ApprovalStatus } from '../../../src/types';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';

/** Her verification state in words, and what the card under it should offer. */
function verification(status: ApprovalStatus | undefined): {
  label: string;
  tone: Tone;
  state: 'none' | 'checking' | 'needs_info' | 'approved' | 'held';
} {
  switch (status) {
    case 'approved':
      return { label: 'Verified member', tone: 'done', state: 'approved' };
    case 'submitted':
    case 'in_review':
      return { label: 'Being checked', tone: 'todo', state: 'checking' };
    case 'needs_info':
      return { label: 'More information needed', tone: 'waiting', state: 'needs_info' };
    case 'suspended':
    case 'banned':
      return { label: 'Account on hold', tone: 'late', state: 'held' };
    default:
      return { label: 'Not verified yet', tone: 'quiet', state: 'none' };
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

function FactRow({ label, items, last }: { label: string; items: string[]; last?: boolean }) {
  if (!items.length) return null;
  return (
    <View style={[styles.fact, !last && styles.factLine]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{items.join(', ')}</Text>
    </View>
  );
}

function InvestorProfileTab() {
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
      <PageTitle
        title={user?.fullName || 'Your profile'}
        subtitle={user?.email}
        right={user?.fullName ? <Avatar name={user.fullName} size={56} /> : undefined}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What you fund</Text>
        {setupQ.isLoading ? (
          <SkeletonCard />
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
            <View>
              <FactRow label="Sectors" items={setup.sectors.map(labelOf)} />
              <FactRow label="Stages" items={setup.stages.map(labelOf)} />
              <FactRow label="How you invest" items={setup.instruments.map(labelOf)} />
              <FactRow label="Where" items={setup.counties.length ? setup.counties.map(labelOf) : ['Anywhere in Kenya']} last />
            </View>
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
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <Tag label={v.label} tone={v.tone} />
        </View>
        {v.state === 'approved' ? (
          <Card style={styles.cardGap}>
            <Text style={styles.muted}>You're verified. You can connect and chat with founders.</Text>
          </Card>
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
        <MenuRow label="Messages" onPress={() => router.push('/conversations')} />
        <MenuRow label="Settings" onPress={() => router.push('/settings')} last />
      </MenuGroup>

      <MenuGroup>
        <MenuRow label="Log out" destructive onPress={() => setConfirmingLogout(true)} last />
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
  wrap: { paddingHorizontal: spacing[2], paddingBottom: spacing[6], gap: spacing[3] },
  section: { gap: spacing[1] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[1] },
  sectionTitle: { fontSize: 12, color: colors.textMuted },
  cardGap: { gap: spacing[1.5] },
  cardTitle: { fontSize: 17, fontWeight: '500', color: colors.primaryDark },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  factLabel: { fontSize: 12, color: colors.textMuted },
  ticket: { fontSize: 24, color: colors.primaryDark, marginTop: 2 },
  fact: { paddingVertical: spacing[1], gap: 2 },
  factLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  factValue: { fontSize: 14, color: colors.text },
  words: { gap: 2, paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.border },
  mandate: { fontSize: 14, color: colors.text },
});

export default withBackdrop(InvestorProfileTab);
