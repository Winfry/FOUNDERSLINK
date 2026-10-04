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
    title: 'Fees',
    body: [
      'Joining, matching, the compliance checklist, Ask Compliance and chat are free for founders.',
      'When an investment between members closes, FoundersLink charges a success fee of 1.5% of the amount invested. The investor pays it. Nothing is charged if a deal does not close.',
      'A deal counts as closed when every party has confirmed closing in the deal room, or when the money has been paid or the shares issued, whichever comes first.',
      'FoundersLink sends an invoice when the deal closes. It is due within 14 days, by M-Pesa Paybill or bank transfer to FoundersLink’s own account, plus any tax the law requires. The investment itself never passes through FoundersLink.',
      'Any other paid service, such as a paid session with an expert, shows its price before you book. You only pay for what you agreed to.',
    ],
  },
  {
    title: 'Deals that start on FoundersLink',
    body: [
      'If you meet an investor or founder through FoundersLink and an investment between you closes within 12 months of your first connection, the success fee applies, even if the deal is finished outside the app.',
      'Record a deal’s progress in its deal room, and confirm closing when it happens. Hiding a deal to avoid the fee breaks these terms and can lead to suspension, and FoundersLink can still recover the fee.',
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
    title: 'What FoundersLink is responsible for',
    body: [
      'FoundersLink is not a party to any deal between members, and does not give investment, legal, tax or financial advice. Every decision to invest, to accept money or to sign is yours.',
      'FoundersLink is not responsible for what members say or do, for a deal that fails, for the value of an investment, or for losses that come from a deal or a contact made through the app.',
      'Where the law allows, FoundersLink’s total responsibility to you is limited to the fees you paid FoundersLink in the 12 months before the claim.',
      'If you break these terms or the law while using FoundersLink, and someone makes a claim against FoundersLink because of it, you agree to cover FoundersLink’s resulting costs.',
    ],
  },
  {
    title: 'Leaving',
    body: [
      'You can delete your account at any time from Settings. The Privacy policy explains what happens to your data.',
      'A success fee for a deal that closed before you left, or within 12 months of a connection made on FoundersLink, is still due.',
    ],
  },
  {
    title: 'Changes and disagreements',
    body: [
      'FoundersLink will tell you at least 30 days before a change to these terms takes effect. A change never applies to a deal that has already closed.',
      'These terms are governed by the laws of Kenya. If there is a disagreement, contact support first. If it is not settled within 30 days, either side may take it to mediation in Nairobi, and then to the courts of Kenya.',
    ],
  },
  {
    title: 'This is a demo',
    body: [
      'FoundersLink is a hackathon demo, and no fees are charged during the demo. It may change, have faults, or be unavailable at times. Do not rely on it as your only record of a deal or a contribution.',
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
