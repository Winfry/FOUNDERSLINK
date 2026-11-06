import { useState } from 'react';
import { Platform, Share } from 'react-native';
import { Button } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';
import { API_URL } from '../../src/services/http/client';
import { exportMyData } from '../../src/services/http/account.http';

const FILE_NAME = 'founderslink-my-data.json';

// "Download my data" (PRODUCT section 5; FINAL_VERIFICATION section 4,
// item 8). The backend puts together everything it holds about her. In a
// browser it is saved as a file; on a phone the share sheet lets her save
// it to Files, email it or keep it anywhere she likes. No other app or
// person gets it unless she chooses.
export default function ExportDataScreen() {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const text = JSON.stringify(await exportMyData(), null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = FILE_NAME;
        link.click();
        URL.revokeObjectURL(url);
        show('Your data is downloaded', 'success');
      } else {
        await Share.share({ title: FILE_NAME, message: text });
      }
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Your data did not download. Check your connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPage
      title="Download my data"
      heading="Everything we hold about you"
      intro="One file with your account, profile, consents, connections, deals, chama records and the messages you sent."
    >
      <Section title="What is not in it">
        <RowGroup>
          <Row label="Other people's details" line="Their messages to you, and their contact details, belong to them." />
          <Row label="FoundersLink's own notes" line="How our team checked your application stays with us." last />
        </RowGroup>
      </Section>
      {API_URL ? (
        <Button title="Download my data" loading={busy} onPress={() => void download()} />
      ) : (
        <Note>This demo is not connected to the FoundersLink server, so there is no data to download.</Note>
      )}
    </SettingsPage>
  );
}
