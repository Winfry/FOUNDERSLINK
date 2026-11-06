import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Switch } from '../../src/components/ui';
import { ScreenError } from '../../src/components/layout/ScreenStates';
import { useToast } from '../../src/components/ui/Toast';
import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';
import { consentService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import type { ConsentPurpose } from '../../src/types';
import { colors } from '../../src/theme/tokens';

// Each consent on its own, changed on its own (FINAL_VERIFICATION 21:
// changing one meant redoing onboarding from a blank form, which then
// overwrote her profile and every other consent). A switch saves at once;
// if the save fails it goes back and says so.
export default function ConsentsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();
  const { show } = useToast();
  const q = useQuery({ queryKey: ['consents', role], queryFn: () => consentService.list(role) });
  const [saving, setSaving] = useState<ConsentPurpose | null>(null);

  const change = async (purpose: ConsentPurpose, granted: boolean, label: string) => {
    setSaving(purpose);
    // Shown at once; put back if the backend does not take it.
    queryClient.setQueryData(['consents', role], (list: typeof q.data) =>
      list?.map((c) => (c.purpose === purpose ? { ...c, granted } : c)),
    );
    try {
      await consentService.set(purpose, granted);
      show(granted ? `${label}: on` : `${label}: off`, 'success');
    } catch (e) {
      queryClient.setQueryData(['consents', role], (list: typeof q.data) =>
        list?.map((c) => (c.purpose === purpose ? { ...c, granted: !granted } : c)),
      );
      show((e as { message?: string })?.message ?? 'Not saved. Check your connection and try again.', 'error');
    } finally {
      setSaving(null);
      // Matches and anything else that depends on a consent read it again.
      void queryClient.invalidateQueries({ queryKey: ['consents'] });
      void queryClient.invalidateQueries({ queryKey: ['funding-matches'] });
    }
  };

  if (q.isError) {
    return <ScreenError message="Your consents did not load. Check your connection and try again." onRetry={() => q.refetch()} />;
  }

  return (
    <SettingsPage
      title="Your consents"
      heading="What FoundersLink may do"
      intro="Each one is separate. Turn any of them on or off at any time."
    >
      <Section>
        {q.isLoading || !q.data ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <RowGroup>
            {q.data.map((c, i) => (
              <Row
                key={c.purpose}
                label={c.label}
                line={c.description}
                last={i === q.data.length - 1}
                right={
                  <Switch
                    value={c.granted}
                    disabled={saving !== null}
                    onValueChange={(on) => void change(c.purpose, on, c.label)}
                    accessibilityLabel={c.label}
                  />
                }
              />
            ))}
          </RowGroup>
        )}
        <Note>
          Turning a consent off stops that use from now on. Your profile stays as it is, except that turning off ownership
          details deletes those answers, as it says above.
        </Note>
      </Section>
    </SettingsPage>
  );
}
