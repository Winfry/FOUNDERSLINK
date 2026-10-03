import { z } from "zod";
import {
  BUSINESS_STATUSES,
  INSTRUMENTS,
  REVENUE_BANDS,
  SECTORS,
  STAGES,
} from "../../shared/constants.js";

const common = z.object({
  business_status: z.enum(BUSINESS_STATUSES),
  business_name: z.string().trim().max(120).optional(),
  description: z.string().trim().min(10, "Tell us a little more about the business").max(2000),
  sector: z.enum(SECTORS),
  county: z.string().trim().min(2).max(60),
  funding_amount_kes: z.number().int().positive().max(2_000_000_000).nullish(),
  use_of_funds: z.string().trim().max(500).optional(),
  already_have: z.array(z.string().max(60)).max(30).default([]),
  women_owned: z.boolean().nullish(),
  youth_owned: z.boolean().nullish(),
  pwd_owned: z.boolean().nullish(),
});

const startup = common.extend({
  journey_type: z.literal("startup"),
  stage: z.enum(STAGES),
  instruments: z.array(z.enum(INSTRUMENTS)).default([]),
});

const sme = common.extend({
  journey_type: z.literal("sme"),
  months_trading: z.number().int().min(0).max(1200),
  monthly_revenue_band: z.enum(REVENUE_BANDS),
  has_employees: z.boolean(),
});

// journey_type decides which path-specific fields are required.
export const profileSchema = z.discriminatedUnion("journey_type", [startup, sme]);

export type ProfileInput = z.infer<typeof profileSchema>;
