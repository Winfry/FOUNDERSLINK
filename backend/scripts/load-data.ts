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
  COUNTIES,
  ELIGIBILITY_FLAGS,
  FUNDER_KINDS,
  INSTRUMENTS,
  JOURNEY_TYPES,
  SECTORS,
  STAGES,
} from "../src/shared/constants.js";
import { prisma } from "../src/shared/db.js";

const date = z.coerce.date().nullish().transform((d) => d ?? null);
const url = z.url().nullish().transform((u) => u ?? null);

const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "use lowercase letters, digits and underscores"),
  title: z.string().min(3),
  why: z.string().nullish().transform((v) => v ?? null),
  institution: z.string().nullish().transform((v) => v ?? null),
  source_url: url,
  last_verified_at: date,
  is_demo: z.boolean().default(false),
});

const funderSchema = z
  .object({
    name: z.string().min(3),
    kind: z.enum(FUNDER_KINDS),
    mandate_text: z.string().min(10),
    journey_types: z.array(z.enum(JOURNEY_TYPES)).min(1),
    sectors: z.array(z.enum(SECTORS)).default([]),
    stages: z.array(z.enum(STAGES)).default([]),
    counties: z.array(z.enum(COUNTIES)).default([]),
    instruments: z.array(z.enum(INSTRUMENTS)).min(1),
    ticket_min_kes: z.number().int().nonnegative(),
    ticket_max_kes: z.number().int().positive(),
    requirements: z.array(z.string()).default([]),
    eligibility: z.array(z.enum(ELIGIBILITY_FLAGS)).default([]),
    application_fee_kes: z.number().int().nonnegative().default(0),
    deadline: date,
    how_to_apply_url: url,
    source_url: url,
    last_verified_at: date,
    verified_by: z.string().nullish().transform((v) => v ?? null),
    is_demo: z.boolean().default(false),
  })
  .refine((f) => f.ticket_min_kes <= f.ticket_max_kes, "ticket_min_kes is above ticket_max_kes");

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
