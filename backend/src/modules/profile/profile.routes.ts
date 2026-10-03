import { Router } from "express";
import { z } from "zod";
import { extractProfile } from "../../ai/client.js";
import { requireAuth } from "../../middlewares/auth.js";
import { prisma } from "../../shared/db.js";
import { AppError, forbidden } from "../../shared/errors.js";
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

  const known = await prisma.complianceItem.findMany({
    where: { id: { in: row.already_have } },
    select: { id: true },
  });
  const knownIds = new Set(known.map((i) => i.id));
  const unknown = row.already_have.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new AppError(400, "UNKNOWN_COMPLIANCE_ITEM", `Unknown items in already_have: ${unknown.join(", ")}`);
  }

  const profile = await prisma.founderProfile.upsert({
    where: { user_id: req.user!.id },
    create: { ...row, user_id: req.user!.id },
    update: row,
  });

  res.json(profile);
});

const extractSchema = z.object({
  text: z.string().trim().min(10, "Tell us a little more about the business").max(2000),
  language: z.enum(["en", "sw"]).optional(),
});

// Turns a typed description into suggested onboarding fields. Nothing is
// saved: the founder reviews the suggestions and submits PUT /me/profile.
profileRouter.post("/me/profile/extract", requireAuth, async (req, res) => {
  const { text, language } = extractSchema.parse(req.body);
  const { fields, unsure, engine } = await extractProfile(text, language);

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
