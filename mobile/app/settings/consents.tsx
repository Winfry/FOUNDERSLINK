import { useState } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Switch, useToast } from '../../src/components/ui';
import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';
import { consentService } from '../../src/services';
import { API_URL } from '../../src/services/http/client';
import { exportMyData } from '../../src/services/http/account.http';
import type { ConsentPurpose } from '../../src/types';

const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message ?? fallback;

export default function ConsentSettingsScreen() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const consents = useQuery({ queryKey: ['consents'], queryFn: () => consentService.list() });
  // What she has just switched, shown at once while it is being saved.
  const [changed, setChanged] = useState<Partial<Record<string, boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const set = async (purpose: ConsentPurpose, label: string, granted: boolean) => {
    setChanged((c) => ({ ...c, [purpose]: granted }));
    setSaving(purpose);
    try {
      await consentService.set(purpose, granted);
      show(granted ? `On: ${label}` : `Off: ${label}`, 'success');
      // Her matches and her profile depend on these.
      void Promise.all(
        [['consents'], ['funding-matches'], ['discover']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    } catch (e) {
      setChanged((c) => ({ ...c, [purpose]: !granted }));
      show(messageOf(e, 'Could not save. Try again.'), 'error');
    } finally {
      setSaving(null);
    }
  };

  const download = async () => {
    if (Platform.OS !== 'web') {
      show('Open FoundersLink in a browser to download your data');
      return;
    }
    if (!API_URL) {
      show('This demo is running without the FoundersLink server, so there is nothing to download.');
      return;
    }
    setDownloading(true);
    try {
      const text = await exportMyData();
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'founderslink-my-data.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      show('Your data is saved to your downloads', 'success');
    } catch (e) {
      show(messageOf(e, 'Could not prepare your data. Try again.'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const rows = consents.data ?? [];

  return (
    <SettingsPage
      title="Privacy and consents"
      heading="You decide what is shared"
      intro="Each switch is saved as soon as you change it. You can change your mind at any time."
    >
      <Section title="Your consents">
        {consents.isError ? (
          <>
            <Note tone="warning">{messageOf(consents.error, 'We could not load your consents. Check your connection and try again.')}</Note>
            <Button title="Try again" variant="secondary" onPress={() => void consents.refetch()} />
          </>
        ) : consents.isLoading ? (
          <Note>Loading your consents…</Note>
        ) : (
          <RowGroup>
            {rows.map((c, i) => (
              <Row
                key={c.purpose}
                label={c.label}
                line={c.description}
                last={i === rows.length - 1}
                right={
                  <Switch
                    value={changed[c.purpose] ?? c.granted}
                    disabled={saving !== null}
                    onValueChange={(on) => void set(c.purpose, c.label, on)}
                    accessibilityLabel={c.label}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  />
                }
              />
            ))}
          </RowGroup>
        )}
      </Section>

      <Section title="Your data">
        <RowGroup>
          <Row
            label="Download my data"
            line="A copy of everything FoundersLink holds about you: your account, profile, consents, connections and messages, as one file."
            last
          />
        </RowGroup>
        <Button title="Download my data" variant="secondary" loading={downloading} onPress={() => void download()} />
      </Section>
    </SettingsPage>
  );
}
