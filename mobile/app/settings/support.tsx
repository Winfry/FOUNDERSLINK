import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Button } from '../../src/components/ui';
import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';
import { colors } from '../../src/theme/tokens';

export default function SupportScreen() {
  const router = useRouter();
  return (
    <SettingsPage title="Contact support" heading="We are here to help" intro="Write to us about your account, a member, or anything that is not working.">
      <Section>
        <RowGroup>
          <Row label="Email" line="support@founderlink.co.ke" right={<Mail size={24} color={colors.primary} />} />
          <Row label="Hours" line="Monday to Friday, 8am to 6pm, Nairobi time" last />
        </RowGroup>
        <Button title="Email support" onPress={() => Linking.openURL('mailto:support@founderlink.co.ke')} />
      </Section>
      <Section title="Compliance questions">
        <Note>For questions about registration, tax or licences, use Ask Compliance in the Readiness tab. It answers straight away.</Note>
        <Button title="Report a member instead" variant="ghost" onPress={() => router.push('/settings/report')} />
      </Section>
    </SettingsPage>
  );
}
