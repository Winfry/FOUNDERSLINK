import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Select, Textarea } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { Note, SettingsPage, useSettingsBack } from '../../src/components/settings/SettingsPage';
import { connectionService } from '../../src/services';
import { reportMember } from '../../src/services/http/account.http';
import { API_URL } from '../../src/services/http/client';
import { colors, spacing } from '../../src/theme/tokens';

export default function ReportScreen() {
  const back = useSettingsBack();
  const { show } = useToast();
  const [who, setWho] = useState('');
  const [details, setDetails] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);

  // She can report anyone she has dealt with here: the people who asked
  // to connect with her, and the people she asked.
  const people = useQuery({ queryKey: ['connections'], queryFn: () => connectionService.list() });
  const seen = new Set<string>();
  const options = (people.data ?? [])
    .filter((c) => (seen.has(c.withUserId) ? false : (seen.add(c.withUserId), true)))
    .map((c) => ({ label: c.withOrganisationName ? `${c.withFullName}, ${c.withOrganisationName}` : c.withFullName, value: c.withUserId }));

  const tooShort = details.trim().length < 5;

  const submit = async () => {
    setTried(true);
    if (!who || tooShort) return;
    setSending(true);
    try {
      // On mock data there is nobody to send it to.
      if (API_URL) await reportMember(who, details.trim());
      show('Report sent to FoundersLink', 'success');
      back();
    } catch (e) {
      show((e as { message?: string })?.message ?? 'We could not send the report. Try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsPage
      title="Report someone"
      heading="Tell us what happened"
      intro="Report anyone who asks for a fee, pressures you, or does not seem to be who they say they are. A person at FoundersLink reads every report."
    >
      <View>
        {options.length === 0 && !people.isLoading ? (
          <Note>
            You can report someone here once you have a connection or a request with them. To report a message, open the chat and use
            the menu beside the message: that sends us the message itself.
          </Note>
        ) : (
          <>
            <Select
              label="Who are you reporting?"
              placeholder="Choose a person"
              options={options}
              value={who}
              onChange={setWho}
              error={tried && !who ? 'Choose who you are reporting.' : undefined}
            />
            <Textarea
              label="What happened"
              placeholder="Say what they did or asked for, and when."
              value={details}
              onChangeText={setDetails}
              style={styles.area}
              error={tried && tooShort ? 'Tell us what happened, in a sentence.' : undefined}
            />
            <Note>You can also report a message from inside the chat, which sends us the message itself.</Note>
          </>
        )}
      </View>
      {options.length > 0 ? <Button title="Send report" loading={sending} onPress={() => void submit()} style={styles.btn} /> : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // The shared text box has no fill of its own.
  area: { backgroundColor: colors.white },
  btn: { marginTop: spacing[1] },
});
