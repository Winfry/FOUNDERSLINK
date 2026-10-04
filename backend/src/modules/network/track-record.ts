// Track records (TEAM_DECISIONS D6): every entry says where it comes
// from, so a reader can tell a verified deal from a claim.

import { z } from "zod";
import { INSTRUMENTS, SECTORS, STAGES } from "../../shared/constants.js";
import type { PortfolioEntry, Venture } from "../../generated/prisma/client.js";

const SOURCE_LABEL: Record<string, string> = {
  platform_deal: "Verified on FoundersLink",
  public: "Public source",
  self_reported: "Self-reported",
};

const year = z.number().int().min(1990).max(new Date().getFullYear());

const visibility = z.enum(["public", "hidden"]);

const portfolioFields = z.object({
  company_name: z.string().trim().min(2).max(120),
  sector: z.enum(SECTORS),
  stage: z.enum(STAGES).optional(),
  year: year.optional(),
  instrument: z.enum(INSTRUMENTS).optional(),
  // A range such as "KSh 500K to 2M", never an exact amount.
  amount_range: z.string().trim().max(40).optional(),
  // A link makes the entry a public source. Without one it is self-reported.
  source_url: z.url().optional(),
});

export const portfolioSchema = portfolioFields.extend({
  visibility: visibility.default("public"),
  company_consented: z.boolean().default(false),
});

// For edits there are no defaults: a field left out keeps its value.
export const portfolioPatchSchema = portfolioFields
  .extend({ visibility, company_consented: z.boolean() })
  .partial();

export const ventureSchema = z.object({
  venture_name: z.string().trim().min(2).max(120),
  sector: z.enum(SECTORS),
  role: z.string().trim().min(2).max(80),
  years: z.string().trim().max(20).optional(),
  outcome: z.string().trim().max(200).optional(),
  source_url: z.url().optional(),
  visibility: visibility.default("public"),
});

// "Verified on FoundersLink" is never something a person can claim for
// herself: it will come only from a deal closed on the platform.
export const sourceOf = (input: { source_url?: string | undefined }) =>
  input.source_url ? "public" : "self_reported";

// What other members see of an investor's portfolio.
export function publicPortfolio(entries: PortfolioEntry[]) {
  return entries
    .filter((e) => e.visibility === "public")
    .map((e) => ({
      id: e.id,
      // A company is named only if it agreed, or the deal is already public.
      company_name: e.company_consented || e.source === "public" ? e.company_name : null,
      sector: e.sector,
      stage: e.stage,
      year: e.year,
      instrument: e.instrument,
      amount_range: e.amount_range,
      source: e.source,
      source_label: SOURCE_LABEL[e.source] ?? e.source,
      source_url: e.source_url,
    }));
}

export function publicVentures(entries: Venture[]) {
  return entries
    .filter((e) => e.visibility === "public")
    .map((e) => ({
      id: e.id,
      venture_name: e.venture_name,
      sector: e.sector,
      role: e.role,
      years: e.years,
      outcome: e.outcome,
      source: e.source,
      source_label: SOURCE_LABEL[e.source] ?? e.source,
      source_url: e.source_url,
    }));
}
