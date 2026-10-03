// Loads compliance items and funder records from JSON into the database.
//
//   npm run db:seed                              loads the demo files in data/
//   npm run db:seed -- <items.json> <funders.json>
//
// Records are checked before anything is written, and loading is safe to
// repeat: items are matched by id and funders by name.

import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  mandateFields,
  optionalDate,
  optionalUrl,
  TICKET_RANGE_MESSAGE,
  ticketRangeIsValid,
} from "../src/modules/funding/funder.schema.js";
import { BUSINESS_STATUSES, COUNTIES, JOURNEY_TYPES, SECTORS } from "../src/shared/constants.js";
import { prisma } from "../src/shared/db.js";

const optionalText = z.string().nullish().transform((v) => v ?? null);

const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "use lowercase letters, digits and underscores"),
  title: z.string().min(3),
  why: optionalText,
  institution: optionalText,
  documents_needed: optionalText,
  when_to_get_help: optionalText,
  scope: z.enum(["business", "deal"]).default("business"),
  deal_type: optionalText,
  jurisdiction_level: z.enum(["national", "county"]).default("national"),
  // Who the item applies to. Every condition given must hold. Empty = everyone.
  applies_when: z
    .strictObject({
      journey_types: z.array(z.enum(JOURNEY_TYPES)).optional(),
      business_statuses: z.array(z.enum(BUSINESS_STATUSES)).optional(),
      counties: z.array(z.enum(COUNTIES)).optional(),
      sectors: z.array(z.enum(SECTORS)).optional(),
      has_employees: z.boolean().optional(),
      handles_personal_data: z.boolean().optional(),
    })
    .default({}),
  recurrence: z.enum(["annual", "quarterly", "monthly"]).nullish().transform((v) => v ?? null),
  finance_act_year: z.number().int().nullish().transform((v) => v ?? null),
  source_url: optionalUrl,
  last_verified_at: optionalDate,
  next_review_at: optionalDate,
  owner: optionalText,
  is_demo: z.boolean().default(false),
});

// A curated record: the mandate, plus where it came from.
const funderSchema = mandateFields
  .extend({
    source_url: optionalUrl,
    last_verified_at: optionalDate,
    verified_by: optionalText,
    is_demo: z.boolean().default(false),
  })
  .refine(ticketRangeIsValid, TICKET_RANGE_MESSAGE);

function read<T>(path: string, schema: z.ZodType<T>): T[] {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const result = z.array(schema).safeParse(raw);
  if (!result.success) {
    console.error(`${path} has invalid records:`);
    for (const issue of result.error.issues) {
      console.error(`  record ${String(issue.path[0])}, ${issue.path.slice(1).join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

const dataDir = new URL("../data/", import.meta.url).pathname;
const itemsPath = process.argv[2] ?? `${dataDir}demo-compliance-items.json`;
const fundersPath = process.argv[3] ?? `${dataDir}demo-funders.json`;

const items = read(itemsPath, itemSchema);
const funders = read(fundersPath, funderSchema);

for (const item of items) {
  await prisma.complianceItem.upsert({ where: { id: item.id }, create: item, update: item });
}

const knownItems = new Set((await prisma.complianceItem.findMany({ select: { id: true } })).map((i) => i.id));
for (const funder of funders) {
  const missing = funder.requirements.filter((id) => !knownItems.has(id));
  if (missing.length > 0) {
    console.error(`${funder.name} requires unknown compliance items: ${missing.join(", ")}`);
    process.exit(1);
  }
}

for (const funder of funders) {
  await prisma.funder.upsert({ where: { name: funder.name }, create: funder, update: funder });
}

console.log(`Loaded ${items.length} compliance items and ${funders.length} funders`);
await prisma.$disconnect();
