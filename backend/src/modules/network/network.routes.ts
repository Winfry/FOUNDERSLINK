import { Router } from "express";
import { PRACTICE_AREAS, RATE_CARD_MAX, rateCardProblem } from "../../../../shared/expert-question/index.js";
import { allowedAreas, professionById, regulatorOf } from "../../../../shared/professions/index.js";
import { z } from "zod";
import { requireApproved, requireAuth, requireRole } from "../../middlewares/auth.js";
import { COUNTIES, PROFESSIONS, SECTORS } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { mandateSchema } from "../funding/funder.schema.js";
import { flagForRecheck } from "../vetting/vetting.service.js";
import { discoverSchema, getInvestorMatches, getProfile } from "./network.service.js";
import { portfolioPatchSchema, portfolioSchema, sourceOf, ventureSchema } from "./track-record.js";

export const networkRouter = Router();

const isInvestor = requireRole("investor");
const isExpert = requireRole("expert");
const isFounder = requireRole("founder");

// --- Investors ---

export const investorProfileSchema = z.object({
  organisation_name: z.string().trim().min(2).max(120),
  job_title: z.string().trim().max(80).optional(),
  organisation_website: z.url().optional(),
  bio: z.string().trim().max(1000).optional(),
});

networkRouter.put("/me/investor-profile", requireAuth, isInvestor, async (req, res) => {
  const input = investorProfileSchema.parse(req.body);
  const row = {
    organisation_name: input.organisation_name,
    job_title: input.job_title ?? null,
    organisation_website: input.organisation_website ?? null,
    bio: input.bio ?? null,
  };
  const before = await prisma.investorProfile.findUnique({ where: { user_id: req.user!.id } });
  const profile = await prisma.investorProfile.upsert({
    where: { user_id: req.user!.id },
    create: { ...row, user_id: req.user!.id },
    update: row,
  });
  // She was approved as acting for one organisation. A different one
  // has to be looked at again.
  if (before && before.organisation_name !== profile.organisation_name) {
    await flagForRecheck(req.user!.id, "Changed the organisation she invests for");
  }
  res.json(profile);
});

// The investor says what she funds. This creates the funder record she
// maintains, or updates it. Founders see it only once she is approved.
networkRouter.put("/me/funder", requireAuth, isInvestor, async (req, res) => {
  const input = mandateSchema.parse(req.body);
  const userId = req.user!.id;

  const known = await prisma.complianceItem.findMany({ where: { id: { in: input.requirements } }, select: { id: true } });
  if (known.length !== new Set(input.requirements).size) {
    throw new AppError(400, "UNKNOWN_COMPLIANCE_ITEM", "requirements contains an unknown compliance item");
  }

  const sameName = await prisma.funder.findUnique({ where: { name: input.name } });
  if (sameName && sameName.claimed_by_user_id !== userId) {
    throw conflict("FUNDER_NAME_TAKEN", "A funder record with this name already exists. Ask to take it over in your vetting application.");
  }

  const existing = await prisma.funder.findUnique({ where: { claimed_by_user_id: userId } });
  if (!existing) {
    const pendingClaim = await prisma.vettingApplication.findFirst({
      where: { user_id: userId, claims_funder_id: { not: null } },
    });
    if (pendingClaim) {
      throw conflict("CLAIM_PENDING", "You asked to take over an existing record. It becomes yours to edit once you are approved.");
    }
  }

  // Maintained by the funder herself, so it is neither demo data nor
  // something we verified from a public source.
  const row = { ...input, is_demo: false, verified_by: "funder", last_verified_at: new Date() };
  const funder = existing
    ? await prisma.funder.update({ where: { id: existing.id }, data: row })
    : await prisma.funder.create({ data: { ...row, claimed_by_user_id: userId } });

  res.json(funder);
});

networkRouter.get("/investor/matches", requireAuth, isInvestor, async (req, res) => {
  res.json(await getInvestorMatches(req.user!.id, discoverSchema.parse(req.query)));
});

networkRouter.post("/me/portfolio", requireAuth, isInvestor, async (req, res) => {
  const input = portfolioSchema.parse(req.body);
  const entry = await prisma.portfolioEntry.create({
    data: { ...input, source: sourceOf(input), investor_id: req.user!.id },
  });
  res.status(201).json(entry);
});

networkRouter.patch("/me/portfolio/:id", requireAuth, isInvestor, async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const input = portfolioPatchSchema.parse(req.body);

  // Scoped to the signed-in investor, so nobody can edit another's entry.
  const mine = await prisma.portfolioEntry.findFirst({ where: { id, investor_id: req.user!.id } });
  if (!mine) throw notFound("No such portfolio entry");
  // An entry created by a closed deal is verified because nobody typed
  // it in. Its visibility is set by the deal's parties, in the deal.
  if (mine.source === "platform_deal") {
    throw conflict("VERIFIED_ENTRY", "This entry comes from a deal closed on FoundersLink and cannot be edited");
  }

  const source_url = "source_url" in input ? input.source_url : (mine.source_url ?? undefined);
  const entry = await prisma.portfolioEntry.update({
    where: { id },
    data: { ...input, source: sourceOf({ source_url }) },
  });
  res.json(entry);
});

// --- Experts ---

export const expertProfileSchema = z.object({
  profession: z.enum(PROFESSIONS),
  organisation_name: z.string().trim().max(120).optional(),
  register_body: z.string().trim().max(40).optional(),
  register_number: z.string().trim().max(40).optional(),
  bio: z.string().trim().min(10).max(1000),
  sectors: z.array(z.enum(SECTORS)).default([]),
  counties: z.array(z.enum(COUNTIES)).default([]),
  services: z.array(z.string().trim().min(2).max(80)).max(10).default([]),
  practice_areas: z.array(z.enum(PRACTICE_AREAS)).max(6).default([]),
  office_hours_per_month: z.number().int().min(0).max(40).default(0),
  country: z.enum(["KE"]).default("KE"),
  licence_expires_at: z.coerce.date().optional(),
  qualification: z.string().trim().max(120).optional(),
  qualification_body: z.string().trim().max(120).optional(),
  // What she charges. Free lines have no price; the others a price in KES.
  rate_card: z
    .array(
      z.object({
        service: z.string().trim().min(2).max(80),
        area: z.enum(PRACTICE_AREAS),
        unit: z.enum(["free", "fixed", "hour"]),
        price_kes: z.number().int().min(0).max(10_000_000).nullable().default(null),
      }),
    )
    .max(RATE_CARD_MAX)
    .default([]),
});

networkRouter.put("/me/expert-profile", requireAuth, isExpert, async (req, res) => {
  const input = expertProfileSchema.parse(req.body);
  // Legal, tax and audit work only for those licensed to do it: each
  // profession offers only its own practice areas (shared/professions).
  const notHers = input.practice_areas.filter((a) => !allowedAreas(input.profession).includes(a));
  if (notHers.length > 0) {
    throw new AppError(400, "AREA_NOT_ALLOWED", `As a ${professionById(input.profession)?.label ?? input.profession}, you cannot offer: ${notHers.join(", ")}`);
  }
  // Each price is for something her profession may offer, and has a price unless free.
  const cardProblem = rateCardProblem(input.rate_card, allowedAreas(input.profession));
  if (cardProblem) throw new AppError(400, "RATE_CARD_INVALID", cardProblem);
  // The register is the profession's own, whatever was sent.
  const regulator = regulatorOf(professionById(input.profession));
  const row = {
    ...input,
    organisation_name: input.organisation_name ?? null,
    register_body: regulator?.short ?? input.register_body ?? null,
    register_number: input.register_number ?? null,
    licence_expires_at: input.licence_expires_at ?? null,
    qualification: input.qualification ?? null,
    qualification_body: input.qualification_body ?? null,
    rate_card: input.rate_card.map((i) => ({ ...i, price_kes: i.unit === "free" ? null : i.price_kes })),
  };
  const before = await prisma.expertProfile.findUnique({ where: { user_id: req.user!.id } });
  const profile = await prisma.expertProfile.upsert({
    where: { user_id: req.user!.id },
    create: { ...row, user_id: req.user!.id },
    update: row,
  });
  const claim = (p: typeof profile) =>
    [p.profession, p.register_body, p.register_number, p.licence_expires_at?.toISOString() ?? "", p.qualification ?? "", p.qualification_body ?? ""].join("|");
  if (before && claim(before) !== claim(profile)) {
    await flagForRecheck(req.user!.id, "Changed her profession, licence or qualification");
  }
  res.json(profile);
});

// --- Founders ---

networkRouter.post("/me/ventures", requireAuth, isFounder, async (req, res) => {
  const input = ventureSchema.parse(req.body);
  const venture = await prisma.venture.create({
    data: { ...input, source: sourceOf(input), founder_id: req.user!.id },
  });
  res.status(201).json(venture);
});

// --- Profiles: only approved members see other members ---

networkRouter.get("/profiles/:id", requireAuth, requireApproved, async (req, res) => {
  res.json(await getProfile(req.user!.id, z.uuid().parse(req.params.id)));
});
