import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { prisma } from "../../shared/db.js";
import { forbidden } from "../../shared/errors.js";
import { profileSchema, type ProfileInput } from "./profile.schema.js";

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
    has_employees: isStartup ? null : input.has_employees,
    already_have: input.already_have,
    women_owned: input.women_owned ?? null,
    youth_owned: input.youth_owned ?? null,
    pwd_owned: input.pwd_owned ?? null,
  };
}

// Saves the founder's onboarding answers. The profile always belongs to
// the signed-in user: the user id comes from the token, never the body.
profileRouter.put("/me/profile", requireAuth, async (req, res) => {
  if (req.user!.role !== "founder") throw forbidden("Only founders have a founder profile");

  const row = toRow(profileSchema.parse(req.body));
  const profile = await prisma.founderProfile.upsert({
    where: { user_id: req.user!.id },
    create: { ...row, user_id: req.user!.id },
    update: row,
  });

  res.json(profile);
});
