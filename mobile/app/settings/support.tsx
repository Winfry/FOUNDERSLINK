import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { SUPPORT_EMAIL } from '../../src/lib/support';
import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';

export default function SupportScreen() {
  const router = useRouter();
  const { show } = useToast();
  // A browser or phone with no email app set up cannot open the link: say
  // where to write instead of doing nothing.
  const email = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() =>
      show(`No email app opened. Write to ${SUPPORT_EMAIL} from your email.`, 'info'),
    );
  return (
    <SettingsPage title="Contact support" heading="We are here to help" intro="Write to us about your account, a member, or anything that is not working.">
      <Section>
        <RowGroup>
          <Row label="Email" line={SUPPORT_EMAIL} />
          <Row label="Hours" line="Monday to Friday, 8am to 6pm, Nairobi time" last />
        </RowGroup>
        <Button title="Email support" onPress={() => void email()} />
      </Section>
      <Section title="Compliance questions">
        <Note>For questions about registration, tax or licences, use Ask Compliance in the Readiness tab. It answers straight away.</Note>
        <Button title="Report a member instead" variant="ghost" onPress={() => router.push('/settings/report')} />
      </Section>
    </SettingsPage>
  );
}
