import { Note, Row, RowGroup, Section, SettingsPage } from '../../src/components/settings/SettingsPage';

export default function SecuritySettingsScreen() {
  return (
    <SettingsPage title="Security" heading="How your account is kept safe" intro="What protects you on FoundersLink today.">
      <Section title="Your account">
        <RowGroup>
          <Row
            label="Password sign-in"
            line="Only someone with your email and password can open your account."
          />
          <Row
            label="Checked members only"
            line="A FoundersLink admin checks every member before they can contact anyone."
          />
          <Row
            label="Contact details stay private"
            line="Your phone and email are shown to another member only after you both accept a connection."
          />
          <Row
            label="Money warnings in chat"
            line="A message that looks like a request for money carries a warning, and you can report it."
            last
          />
        </RowGroup>
      </Section>
      <Note>FoundersLink never holds or moves money, and nobody should ask you for a fee to receive funding. If someone does, report them from Settings.</Note>
    </SettingsPage>
  );
}
