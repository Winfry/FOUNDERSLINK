import { Router } from "express";
import { z } from "zod";
import { requireApproved, requireAuth, requireRole } from "../../middlewares/auth.js";
import { COUNTIES, PROFESSIONS, SECTORS } from "../../shared/constants.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { mandateSchema } from "../funding/funder.schema.js";
import { getInvestorMatches, getProfile } from "./network.service.js";
import { portfolioPatchSchema, portfolioSchema, sourceOf, ventureSchema } from "./track-record.js";

export const networkRouter = Router();

const isInvestor = requireRole("investor");
const isExpert = requireRole("expert");
const isFounder = requireRole("founder");

// --- Investors ---

const investorProfileSchema = z.object({
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
  const profile = await prisma.investorProfile.upsert({
    where: { user_id: req.user!.id },
    create: { ...row, user_id: req.user!.id },
    update: row,
  });
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
  res.json(await getInvestorMatches(req.user!.id));
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
    throw conflict("VERIFIED_ENTRY", "This entry comes from a deal closed on FounderLink and cannot be edited");
  }

  const source_url = "source_url" in input ? input.source_url : (mine.source_url ?? undefined);
  const entry = await prisma.portfolioEntry.update({
    where: { id },
    data: { ...input, source: sourceOf({ source_url }) },
  });
  res.json(entry);
});

// --- Experts ---

const expertProfileSchema = z.object({
  profession: z.enum(PROFESSIONS),
  organisation_name: z.string().trim().max(120).optional(),
  register_body: z.string().trim().max(40).optional(),
  register_number: z.string().trim().max(40).optional(),
  bio: z.string().trim().min(10).max(1000),
  sectors: z.array(z.enum(SECTORS)).default([]),
  counties: z.array(z.enum(COUNTIES)).default([]),
  services: z.array(z.string().trim().min(2).max(80)).max(10).default([]),
  office_hours_per_month: z.number().int().min(0).max(40).default(0),
});

networkRouter.put("/me/expert-profile", requireAuth, isExpert, async (req, res) => {
  const input = expertProfileSchema.parse(req.body);
  const row = {
    ...input,
    organisation_name: input.organisation_name ?? null,
    register_body: input.register_body ?? null,
    register_number: input.register_number ?? null,
  };
  const profile = await prisma.expertProfile.upsert({
    where: { user_id: req.user!.id },
    create: { ...row, user_id: req.user!.id },
    update: row,
  });
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
