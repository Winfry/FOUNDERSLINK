import { LegalPage, type LegalSection } from '../../src/components/settings/LegalPage';

const SECTIONS: LegalSection[] = [
  {
    title: 'The law we follow',
    body: [
      'FoundersLink handles your personal data in line with Kenya’s Data Protection Act, 2019. FoundersLink is a demo built at GirlCode Kenya 2026, and this policy describes what the demo really does.',
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Your account details: name, email and phone number.',
      'Your business profile.',
      'Your verification application and statement.',
      'Documents you share at verification or in a deal.',
      'Your messages, and your chama records.',
      'We do not collect ID or passport numbers, or copies of those documents.',
    ],
  },
  {
    title: 'Your consent',
    body: [
      'Nothing is used without your consent. You give four separate consents: for your profile to be visible, for AI matching, for contact by SMS or WhatsApp, and for AI reading of your documents.',
      'You can withdraw each one at any time.',
      'Without the AI matching consent, your details are not sent to the AI service.',
    ],
  },
  {
    title: 'Who sees your details',
    body: [
      'Your contact details are shown to another member only after you have both accepted a connection.',
      'A FoundersLink admin sees your application in order to check it. Every decision is made by a person. A risk check only sorts the review queue.',
    ],
  },
  {
    title: 'How long we keep files',
    body: ['Files you upload are deleted 30 days after the decision on your application, or 30 days after the deal ends.'],
  },
  {
    title: 'Your rights',
    body: [
      'You can ask us for a copy of everything we hold about you, by email to support.',
      'You can delete your account from Settings. Your profile, matches, chats and files are removed. Shared records, such as a closed deal, keep your part in anonymous form.',
    ],
  },
  {
    title: 'Keeping you safe',
    body: ['Messages that look like a request for money carry a warning, and you can report them.'],
  },
  {
    title: 'Limits you should know about',
    body: [
      'This is a demo. Uploaded files are currently stored on the server without encryption at rest. Please do not upload anything you would not want stored that way.',
      'Questions about your data can be sent from Contact support in Settings.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy policy"
      heading="Privacy policy"
      intro="What we collect, why, and the choices you have."
      sections={SECTIONS}
    />
  );
}
