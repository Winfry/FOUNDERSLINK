// Consent, purpose by purpose (Data Protection Act 2019). The rest of
// the backend asks here before it shows a person to others, sends her
// details to the AI service, or stores an eligibility attribute.

import { z } from "zod";
import { CONSENT_PURPOSES } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";

export type Purpose = (typeof CONSENT_PURPOSES)[number];

export const consentSchema = z.object({
  purpose: z.enum(CONSENT_PURPOSES),
  granted: z.boolean(),
});

export async function hasConsent(userId: string, purpose: Purpose): Promise<boolean> {
  const row = await prisma.consent.findUnique({ where: { user_id_purpose: { user_id: userId, purpose } } });
  return row?.granted ?? false;
}

// Which of these people have agreed to this purpose.
export async function consented(userIds: string[], purpose: Purpose): Promise<Set<string>> {
  const rows = await prisma.consent.findMany({
    where: { user_id: { in: userIds }, purpose, granted: true },
    select: { user_id: true },
  });
  return new Set(rows.map((r) => r.user_id));
}

// Every purpose, with what she has said. A purpose she has never
// answered shows as not granted.
export async function listConsents(userId: string) {
  const rows = await prisma.consent.findMany({ where: { user_id: userId } });
  const byPurpose = new Map(rows.map((r) => [r.purpose, r]));
  return CONSENT_PURPOSES.map((purpose) => ({
    purpose,
    granted: byPurpose.get(purpose)?.granted ?? false,
    granted_at: byPurpose.get(purpose)?.granted_at ?? null,
    withdrawn_at: byPurpose.get(purpose)?.withdrawn_at ?? null,
  }));
}

export async function setConsent(userId: string, input: z.infer<typeof consentSchema>) {
  const now = new Date();
  const change = input.granted ? { granted: true, granted_at: now, withdrawn_at: null } : { granted: false, withdrawn_at: now };

  await prisma.consent.upsert({
    where: { user_id_purpose: { user_id: userId, purpose: input.purpose } },
    create: { user_id: userId, purpose: input.purpose, ...change },
    update: change,
  });

  // Withdrawing consent for eligibility attributes removes them, not
  // just stops new ones: she no longer agrees to us holding them.
  if (input.purpose === "eligibility_attributes" && !input.granted) {
    await prisma.founderProfile.updateMany({
      where: { user_id: userId },
      data: { women_owned: null, youth_owned: null, pwd_owned: null },
    });
  }

  return listConsents(userId);
}
