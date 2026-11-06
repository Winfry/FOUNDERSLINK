import type { ConsentPurpose, ConsentRecord } from '../types';

// Only an investor's wording differs; any other role reads as a founder's.
type Role = string | undefined;

// What each consent allows, in the words shown on every screen that asks.
// The backend keeps five, each on its own (PRODUCT section 5, Data
// Protection Act 2019). Whether each is granted always comes from it.
export function consentWording(role: Role): Omit<ConsentRecord, 'granted'>[] {
  const founder = role !== 'investor';
  return [
    {
      purpose: 'profile_visibility',
      label: 'Show my profile',
      description: founder
        ? 'Verified investors and members can see your business profile and be matched with you. Off: you are left out of their searches and matches.'
        : 'Verified founders and members can see your investor profile and be matched with you. Off: you are left out of their searches and matches.',
    },
    {
      purpose: 'ai_matching',
      label: founder ? 'Match me with investors' : 'Match me with founders',
      description: founder
        ? 'Your business details are used, including by FoundersLink\'s AI service, to suggest investors who fit. Off: no matches are worked out for you.'
        : 'What you fund is used, including by FoundersLink\'s AI service, to suggest founders who fit. Off: no matches are worked out for you.',
    },
    ...(founder
      ? [
          {
            purpose: 'eligibility_attributes' as const,
            label: 'Ownership details for eligibility',
            description:
              'Keep whether your business is women-, youth- or disability-owned, to check funds that are only for them. Off: these answers are deleted.',
          },
        ]
      : []),
    {
      purpose: 'contact',
      label: 'Contact me by SMS or WhatsApp',
      description: 'FoundersLink can send you notifications by SMS. Off: you get them in the app only.',
    },
    {
      purpose: 'document_processing',
      label: 'AI reading of documents I share',
      description:
        'Documents you share in a deal may be read by an outside AI model to pre-check them. Off: they are never sent to an outside model, and a person checks them.',
    },
  ];
}

export const ALL_CONSENTS: ConsentPurpose[] = ['profile_visibility', 'ai_matching', 'eligibility_attributes', 'contact', 'document_processing'];
