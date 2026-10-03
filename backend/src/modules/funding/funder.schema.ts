import { z } from "zod";
import {
  COUNTIES,
  ELIGIBILITY_FLAGS,
  FUNDER_KINDS,
  INSTRUMENTS,
  JOURNEY_TYPES,
  SECTORS,
  STAGES,
} from "../../shared/constants.js";

export const optionalDate = z.coerce.date().nullish().transform((d) => d ?? null);
export const optionalUrl = z.url().nullish().transform((u) => u ?? null);

// What a funder funds. The same fields whether we curate the record from
// public information or an investor maintains it herself.
export const mandateFields = z.object({
  name: z.string().trim().min(3).max(120),
  kind: z.enum(FUNDER_KINDS),
  mandate_text: z.string().trim().min(10).max(1000),
  journey_types: z.array(z.enum(JOURNEY_TYPES)).min(1),
  sectors: z.array(z.enum(SECTORS)).default([]),
  stages: z.array(z.enum(STAGES)).default([]),
  counties: z.array(z.enum(COUNTIES)).default([]),
  instruments: z.array(z.enum(INSTRUMENTS)).min(1),
  ticket_min_kes: z.number().int().nonnegative(),
  ticket_max_kes: z.number().int().positive().max(2_000_000_000),
  requirements: z.array(z.string()).default([]),
  eligibility: z.array(z.enum(ELIGIBILITY_FLAGS)).default([]),
  application_fee_kes: z.number().int().nonnegative().default(0),
  deadline: optionalDate,
  how_to_apply_url: optionalUrl,
});

export const ticketRangeIsValid = (f: { ticket_min_kes: number; ticket_max_kes: number }) =>
  f.ticket_min_kes <= f.ticket_max_kes;
export const TICKET_RANGE_MESSAGE = "ticket_min_kes is above ticket_max_kes";

export const mandateSchema = mandateFields.refine(ticketRangeIsValid, TICKET_RANGE_MESSAGE);
