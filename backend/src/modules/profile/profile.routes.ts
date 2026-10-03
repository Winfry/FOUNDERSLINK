import { Router } from "express";
import { z } from "zod";
import { extractProfile } from "../../ai/client.js";
import { requireAuth } from "../../middlewares/auth.js";
import { prisma } from "../../shared/db.js";
import { AppError, forbidden } from "../../shared/errors.js";
import { hasConsent } from "../account/consents.js";
import { completedFor, setStatus } from "../compliance/status.js";
import { extractableFields, profileSchema, type ProfileInput } from "./profile.schema.js";

export const profileRouter = Router();

// Builds the full row, so switching path clears the other path's fields.
function toRow(input: ProfileInput) {
  const isStartup = input.journey_type === "startup";
  return {
    journey_type: input.journey_type,
    business_status: input.business_status,
    business_name: input.business_name ?? null,
    description: input.description,
    sector: input.sector,
    county: input.county,
    funding_amount_kes: input.funding_amount_kes ?? null,
    use_of_funds: input.use_of_funds ?? null,
    stage: isStartup ? input.stage : null,
    instruments: isStartup ? input.instruments : [],
    months_trading: isStartup ? null : input.months_trading,
    monthly_revenue_band: isStartup ? null : input.monthly_revenue_band,
    has_employees: input.has_employees ?? null,
    handles_personal_data: input.handles_personal_data ?? null,
    women_owned: input.women_owned ?? null,
    youth_owned: input.youth_owned ?? null,
    pwd_owned: input.pwd_owned ?? null,
  };
}

// Saves the founder's onboarding answers. The profile always belongs to
// the signed-in user: the user id comes from the token, never the body.
profileRouter.put("/me/profile", requireAuth, async (req, res) => {
  if (req.user!.role !== "founder") throw forbidden("Only founders have a founder profile");

  const input = profileSchema.parse(req.body);
  const row = toRow(input);
  const userId = req.user!.id;

  // Women-, youth- and PWD-owned are sensitive. They are stored only if
  // she has agreed to that, and used only to check funder eligibility.
  const givesEligibility = [row.women_owned, row.youth_owned, row.pwd_owned].some((v) => v !== null);
  if (givesEligibility && !(await hasConsent(userId, "eligibility_attributes"))) {
    throw new AppError(409, "CONSENT_REQUIRED", "Agree to share eligibility details before adding them");
  }

  const known = await prisma.complianceItem.findMany({
    where: { id: { in: input.already_have }, scope: "business" },
    select: { id: true },
  });
  const knownIds = new Set(known.map((i) => i.id));
  const unknown = input.already_have.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new AppError(400, "UNKNOWN_COMPLIANCE_ITEM", `Unknown items in already_have: ${unknown.join(", ")}`);
  }

  const profile = await prisma.founderProfile.upsert({
    where: { user_id: userId },
    create: { ...row, user_id: userId },
    update: row,
  });

  // Ticking an item here marks it complete. Leaving one out changes
  // nothing: progress is undone on the checklist, not by re-saving this form.
  for (const itemId of input.already_have) await setStatus(userId, itemId, "complete");

  res.json({ ...profile, already_have: await completedFor(userId) });
});

const extractSchema = z.object({
  text: z.string().trim().min(10, "Tell us a little more about the business").max(2000),
  language: z.enum(["en", "sw"]).optional(),
});

// Turns a typed description into suggested onboarding fields. Nothing is
// saved: the founder reviews the suggestions and submits PUT /me/profile.
profileRouter.post("/me/profile/extract", requireAuth, async (req, res) => {
  const { text, language } = extractSchema.parse(req.body);
  const useAi = await hasConsent(req.user!.id, "ai_matching");
  const { fields, unsure, engine } = await extractProfile(text, language, useAi);

  // Keep only fields we know, with values the profile would accept.
  const suggested: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [key, schema] of Object.entries(extractableFields)) {
    if (!(key in fields)) continue;
    const parsed = schema.safeParse(fields[key]);
    if (parsed.success) suggested[key] = parsed.data;
    else dropped.push(key);
  }

  res.json({
    fields: suggested,
    unsure: [...new Set([...unsure.filter((k) => k in extractableFields), ...dropped])],
    engine,
  });
});
