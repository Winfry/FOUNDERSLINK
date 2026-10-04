import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Input, Select, Textarea } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { Note, SettingsPage, useSettingsBack } from '../../src/components/settings/SettingsPage';
import { colors, spacing } from '../../src/theme/tokens';

export default function ReportScreen() {
  const back = useSettingsBack();
  const { show } = useToast();
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (!target || !name.trim() || !details.trim()) return;
    show('Report received', 'success');
    back();
  };

  return (
    <SettingsPage
      title="Report or block"
      heading="Tell us what happened"
      intro="Report anyone who asks for a fee, pressures you, or does not seem to be who they say they are."
    >
      <View>
        <Select
          label="Who are you reporting?"
          placeholder="Choose one"
          options={[
            { label: 'A member', value: 'user' },
            { label: 'A chama', value: 'group' },
          ]}
          value={target}
          onChange={setTarget}
          error={tried && !target ? 'Choose who you are reporting.' : undefined}
        />
        <Input
          label="Their name"
          placeholder="For example, the name shown in the chat"
          value={name}
          onChangeText={setName}
          error={tried && !name.trim() ? 'Write their name.' : undefined}
        />
        <Textarea
          label="What happened"
          placeholder="Say what they did or asked for, and when."
          value={details}
          onChangeText={setDetails}
          style={styles.area}
          error={tried && !details.trim() ? 'Tell us what happened.' : undefined}
        />
        <Note>You can also report a message from inside the chat, which sends us the message itself.</Note>
      </View>
      <Button title="Send report" onPress={submit} style={styles.btn} />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // The shared text box has no fill of its own.
  area: { backgroundColor: colors.white },
  btn: { marginTop: spacing[1] },
});
