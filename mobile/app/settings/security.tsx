import { KeyRound, MessageSquareWarning, ShieldCheck, UserCheck } from 'lucide-react-native';
import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';
import { colors } from '../../src/theme/tokens';

export default function SecuritySettingsScreen() {
  return (
    <SettingsPage title="Security" heading="How your account is kept safe" intro="What protects you on FoundersLink today.">
      <Section title="Your account">
        <RowGroup>
          <Row
            label="Password sign-in"
            line="Only someone with your email and password can open your account."
            right={<KeyRound size={24} color={colors.primary} />}
          />
          <Row
            label="Checked members only"
            line="A FoundersLink admin checks every member before they can contact anyone."
            right={<UserCheck size={24} color={colors.primary} />}
          />
          <Row
            label="Contact details stay private"
            line="Your phone and email are shown to another member only after you both accept a connection."
            right={<ShieldCheck size={24} color={colors.primary} />}
          />
          <Row
            label="Money warnings in chat"
            line="A message that looks like a request for money carries a warning, and you can report it."
            right={<MessageSquareWarning size={24} color={colors.primary} />}
            last
          />
        </RowGroup>
      </Section>
      <Note>FoundersLink never holds or moves money, and nobody should ask you for a fee to receive funding. If someone does, report them from Settings.</Note>
    </SettingsPage>
  );
}
