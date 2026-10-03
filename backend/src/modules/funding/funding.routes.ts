import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { getMatches, listComplianceItems, listFunders } from "./funding.service.js";

export const fundingRouter = Router();

// Public: the onboarding form needs it for the "what you already have" list.
fundingRouter.get("/compliance/items", async (_req, res) => {
  res.json((await listComplianceItems()).filter((item) => item.scope === "business"));
});

fundingRouter.get("/funders", requireAuth, async (_req, res) => {
  res.json(await listFunders());
});

fundingRouter.get("/funding/matches", requireAuth, async (req, res) => {
  res.json(await getMatches(req.user!.id));
});
