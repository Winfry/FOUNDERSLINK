import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Switch } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { Note, RadioRow, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';
import { API_URL } from '../../src/services/http/client';
import { updatePreferences } from '../../src/services/http/account.http';

type Channel = 'in_app' | 'sms';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [channel, setChannel] = useState<Channel>('in_app');
  const [chat, setChat] = useState(true);
  const [deals, setDeals] = useState(true);
  const [email, setEmail] = useState(true);

  // With the backend the choice is saved on her account; without it, it stays on this screen.
  const pickChannel = async (next: Channel) => {
    if (next === channel) return;
    const before = channel;
    setChannel(next);
    if (!API_URL) return;
    try {
      await updatePreferences({ notification_channel: next });
      show(next === 'sms' ? 'We will tell you by SMS' : 'We will tell you in the app', 'success');
    } catch (e) {
      setChannel(before);
      show((e as { message?: string })?.message ?? 'Could not save. Try again.', 'error');
    }
  };

  return (
    <SettingsPage title="Notifications" heading="How we reach you" intro="Choose where FounderLink tells you about requests, messages and deal steps.">
      <Section title="Where to tell you">
        <RowGroup>
          <RadioRow label="In the app" line="Updates wait for you in FounderLink." selected={channel === 'in_app'} onPress={() => pickChannel('in_app')} />
          <RadioRow label="By SMS" line="Sent to the phone number on your account." selected={channel === 'sms'} onPress={() => pickChannel('sms')} last />
        </RowGroup>
      </Section>

      <Section title="What to tell you about">
        <RowGroup>
          <Row label="Chat messages" right={<Switch value={chat} onValueChange={setChat} accessibilityLabel="Chat messages" />} />
          <Row label="Deal and connection updates" right={<Switch value={deals} onValueChange={setDeals} accessibilityLabel="Deal and connection updates" />} />
          <Row label="Email updates" right={<Switch value={email} onValueChange={setEmail} accessibilityLabel="Email updates" />} last />
        </RowGroup>
        <Note>These three switches are not saved yet in this demo. They go back to on when you leave this page.</Note>
      </Section>

      <Button title="Set up push alerts" variant="secondary" onPress={() => router.push('/settings/push-permission')} />
    </SettingsPage>
  );
}
