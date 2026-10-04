import { LegalPage, type LegalSection } from '../../src/components/settings/LegalPage';

const SECTIONS: LegalSection[] = [
  {
    title: 'What FoundersLink is',
    body: [
      'FoundersLink connects Kenyan startup founders with investors. It was built as a demo at GirlCode Kenya 2026.',
      'By using the app you agree to these terms. If you do not agree, please do not use it.',
    ],
  },
  {
    title: 'FoundersLink does not handle money',
    body: [
      'FoundersLink never holds, moves or guarantees money. When you and an investor agree a deal, the app records it. The money moves between the two of you through your banks.',
      'The terms recorded in a deal are what the two sides reported. They are not a legal document. Have your own agreement prepared and signed outside the app.',
      'Chama contributions go to the chama’s own Paybill or account. The app only records them.',
    ],
  },
  {
    title: 'Matches and compliance information',
    body: [
      'Match suggestions show which investors may fit your business. They are not a guarantee of funding.',
      'Compliance information in the app, including answers from Ask Compliance, is general information. It is not legal advice. For a decision that matters, speak to a qualified professional.',
    ],
  },
  {
    title: 'How members are checked',
    body: [
      'A FoundersLink admin checks each member before they can contact others. Every decision is made by a person.',
      'A risk check is used only to sort the order in which applications are reviewed. It does not approve or refuse anyone.',
      'Being checked does not mean FoundersLink vouches for a member or for any deal. Do your own checks before you agree to anything.',
    ],
  },
  {
    title: 'Rules of use',
    body: [
      'Be truthful in your profile, your application and your messages.',
      'Never ask another member for a fee in order to receive funding. If someone asks you for one, do not pay.',
      'Report anything that looks wrong, from the chat or from Settings.',
      'An admin can suspend an account that breaks these rules, and will give a reason.',
    ],
  },
  {
    title: 'Leaving',
    body: ['You can delete your account at any time from Settings. The Privacy policy explains what happens to your data.'],
  },
  {
    title: 'This is a demo',
    body: [
      'FoundersLink is a hackathon demo. It may change, have faults, or be unavailable at times. Do not rely on it as your only record of a deal or a contribution.',
      'Questions about these terms can be sent from Contact support in Settings.',
    ],
  },
];

export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms of service"
      heading="Terms of service"
      intro="The rules for using FoundersLink, in plain language."
      sections={SECTIONS}
    />
  );
}
