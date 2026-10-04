import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { Button, Card } from '../../../src/components/ui';
import { Header } from '../../../src/components/layout/Header';
import { ScreenError, ScreenLoading } from '../../../src/components/layout/ScreenStates';
import { kes, words } from '../../../src/components/matches/parts';
import { investorService, referenceDataService } from '../../../src/services';
import { colors, spacing, touchTargetMin } from '../../../src/theme/tokens';

export default function FounderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({ queryKey: ['founder-profile', id], queryFn: () => investorService.getFounderPublicProfile(String(id)) });
  const metaQ = useQuery({ queryKey: ['meta-options'], queryFn: () => referenceDataService.getMetaOptions() });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const labels = (metaQ.data?.labels as Record<string, string> | undefined) ?? {};
  const label = (value: string | null) => (value ? (labels[value] ?? words(value)) : '');

  if (q.isLoading) {
    return (
      <View style={styles.screen}>
        <Header title="Founder" onBack={back} />
        <ScreenLoading />
      </View>
    );
  }
  if (q.isError || !q.data) {
    const err = q.error as { message?: string; code?: string } | null;
    return (
      <View style={styles.screen}>
        <Header title="Founder" onBack={back} />
        <ScreenError
          message={err?.message ?? 'This founder did not load. Check your connection and try again.'}
          code={err?.code}
          onRetry={() => q.refetch()}
        />
      </View>
    );
  }

  const p = q.data;
  const status = p.connection.status;
  const website = p.website ? (/^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`) : null;

  const facts: { label: string; value: string; href?: string }[] = [
    p.sector ? { label: 'Sector', value: label(p.sector) } : null,
    p.stage ? { label: 'Stage', value: label(p.stage) } : null,
    p.county ? { label: 'County', value: p.county } : null,
    p.yearStarted ? { label: 'Year started', value: String(p.yearStarted) } : null,
    p.website && website ? { label: 'Website', value: p.website.replace(/^https?:\/\//i, ''), href: website } : null,
  ].filter((f): f is { label: string; value: string; href?: string } => f !== null);

  return (
    <View style={styles.screen}>
      <Header title="Founder" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{p.businessName ?? p.founderName}</Text>
        {p.businessName ? <Text style={styles.person}>Founded by {p.founderName}</Text> : null}

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Looking for</Text>
          <Text style={styles.heroAmount}>{p.fundingAskKes ? kes(p.fundingAskKes) : 'Amount not shared yet'}</Text>
          {p.useOfFunds ? (
            <>
              <Text style={styles.heroSubLabel}>What the money is for</Text>
              <Text style={styles.heroText}>{p.useOfFunds}</Text>
            </>
          ) : null}
        </View>

        {p.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the business</Text>
            <Text style={styles.body}>{p.description}</Text>
          </View>
        ) : null}

        {facts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The facts</Text>
            <Card style={styles.card}>
              {facts.map((f, i) => {
                const href = f.href;
                return (
                  <View key={f.label} style={[styles.factRow, i > 0 && styles.divider]}>
                    <Text style={styles.factLabel}>{f.label}</Text>
                    {href ? (
                      <Pressable
                        onPress={() => void Linking.openURL(href)}
                        accessibilityRole="link"
                        accessibilityLabel={`Open ${f.value}`}
                        style={styles.linkPress}
                      >
                        <Text style={styles.link}>{f.value}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.factValue}>{f.value}</Text>
                    )}
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earlier ventures</Text>
          {p.ventures.length > 0 ? (
            <Card style={styles.card}>
              {p.ventures.map((v, i) => (
                <View key={`${v.name}-${i}`} style={[styles.venture, i > 0 && styles.divider]}>
                  <Text style={styles.ventureName}>{v.name}</Text>
                  <Text style={styles.ventureMeta}>{[words(v.role), v.years].filter(Boolean).join(', ')}</Text>
                  {v.outcome ? <Text style={styles.ventureOutcome}>{v.outcome}</Text> : null}
                </View>
              ))}
            </Card>
          ) : (
            <Text style={styles.body}>No earlier ventures shared.</Text>
          )}
        </View>

        <View style={styles.action}>
          {status === 'accepted' ? (
            <>
              <Button title="Open chats" onPress={() => router.push('/conversations')} />
              <Text style={styles.actionHint}>You are connected with {p.founderName}.</Text>
            </>
          ) : status === 'pending' ? (
            <Button title="Request sent, waiting for her reply" disabled onPress={() => undefined} />
          ) : (
            <>
              <Button title="Ask to join" onPress={() => router.push(`/investor/join-request/${p.id}`)} />
              <Text style={styles.actionHint}>
                {status === 'declined'
                  ? 'She declined an earlier request. You can send a new one.'
                  : 'She sees your request and decides whether to connect.'}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[6] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  person: { fontSize: 16, fontWeight: '500', color: colors.textMuted, marginTop: spacing[0.5] },

  hero: { marginTop: spacing[2], padding: spacing[3], borderRadius: 20, backgroundColor: colors.primaryDark, gap: spacing[0.5] },
  heroLabel: { fontSize: 14, fontWeight: '600', color: '#D6E4FB' },
  heroAmount: { fontSize: 24, fontWeight: '800', color: colors.white },
  heroSubLabel: { fontSize: 14, fontWeight: '600', color: '#D6E4FB', marginTop: spacing[1.5] },
  heroText: { fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.white },

  section: { marginTop: spacing[3], gap: spacing[1.5] },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.text },
  card: { borderRadius: 16, paddingVertical: spacing[0.5] },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },

  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    minHeight: touchTargetMin,
    paddingVertical: spacing[1],
  },
  factLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  factValue: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'right' },
  linkPress: { flex: 1, minHeight: touchTargetMin, justifyContent: 'center' },
  link: { fontSize: 16, fontWeight: '700', color: colors.primary, textAlign: 'right' },

  venture: { paddingVertical: spacing[1.5], gap: 2 },
  ventureName: { fontSize: 16, fontWeight: '700', color: colors.text },
  ventureMeta: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  ventureOutcome: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 2 },

  action: { marginTop: spacing[4], gap: spacing[1] },
  actionHint: { fontSize: 14, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
});
