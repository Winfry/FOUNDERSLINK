import { z } from "zod";
import {
  BUSINESS_STATUSES,
  COUNTIES,
  INSTRUMENTS,
  JOURNEY_TYPES,
  REVENUE_BANDS,
  SECTORS,
  STAGES,
} from "../../shared/constants.js";

const fundingAmount = z.number().int().positive().max(2_000_000_000);
const useOfFunds = z.string().trim().max(500);
const monthsTrading = z.number().int().min(0).max(1200);
const instruments = z.array(z.enum(INSTRUMENTS));

const common = z.object({
  business_status: z.enum(BUSINESS_STATUSES),
  business_name: z.string().trim().max(120).optional(),
  description: z.string().trim().min(10, "Tell us a little more about the business").max(2000),
  sector: z.enum(SECTORS),
  county: z.enum(COUNTIES),
  funding_amount_kes: fundingAmount.nullish(),
  use_of_funds: useOfFunds.optional(),
  year_started: z.number().int().min(1950).max(new Date().getFullYear()).nullish(),
  website: z.url().nullish(),
  social_links: z.array(z.url()).max(5).default([]),
  // Things she already has, ticked during onboarding. Each one is saved
  // as a completed item on her compliance checklist.
  already_have: z.array(z.string().max(60)).max(30).default([]),
  has_employees: z.boolean().nullish(),
  handles_personal_data: z.boolean().nullish(),
  women_owned: z.boolean().nullish(),
  youth_owned: z.boolean().nullish(),
  pwd_owned: z.boolean().nullish(),
});

const startup = common.extend({
  journey_type: z.literal("startup"),
  stage: z.enum(STAGES),
  instruments: instruments.default([]),
});

const sme = common.extend({
  journey_type: z.literal("sme"),
  months_trading: monthsTrading,
  monthly_revenue_band: z.enum(REVENUE_BANDS),
  // Optional for a startup, but an SME must answer.
  has_employees: z.boolean(),
});

// journey_type decides which path-specific fields are required.
export const profileSchema = z.discriminatedUnion("journey_type", [startup, sme]);

export type ProfileInput = z.infer<typeof profileSchema>;

// Fields the AI may suggest from a description. Eligibility flags and
// already_have are left out on purpose: the founder states those herself.
export const extractableFields: Record<string, z.ZodType> = {
  journey_type: z.enum(JOURNEY_TYPES),
  business_status: z.enum(BUSINESS_STATUSES),
  sector: z.enum(SECTORS),
  county: z.enum(COUNTIES),
  funding_amount_kes: fundingAmount,
  use_of_funds: useOfFunds,
  stage: z.enum(STAGES),
  instruments,
  months_trading: monthsTrading,
  monthly_revenue_band: z.enum(REVENUE_BANDS),
  has_employees: z.boolean(),
  handles_personal_data: z.boolean(),
};

// How much of her profile is filled in, as a whole percentage. It counts
// the fields that make her matches and her profile page better, and only
// the ones that apply to her path.
export function profileCompleteness(p: Record<string, unknown>): number {
  const common = ["business_name", "description", "funding_amount_kes", "use_of_funds", "year_started", "website", "has_employees", "handles_personal_data"];
  const path = p.journey_type === "startup" ? ["stage", "instruments"] : ["months_trading", "monthly_revenue_band"];
  const fields = [...common, ...path];
  const filled = fields.filter((f) => {
    const value = p[f];
    return value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
  });
  return Math.round((filled.length / fields.length) * 100);
}
