import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { getMatches, listComplianceItems, listFunders } from "./funding.service.js";

export const fundingRouter = Router();

// Public: the onboarding form needs it for the "what you already have" list.
fundingRouter.get("/compliance/items", async (_req, res) => {
  const items = await listComplianceItems();
  // Only what the form shows. Who owns an item, when it is due for
  // review and the rules that select it stay inside.
  res.json(
    items
      .filter((item) => item.scope === "business")
      .map(({ id, title, why, institution }) => ({ id, title, why, institution })),
  );
});

fundingRouter.get("/funders", requireAuth, async (_req, res) => {
  res.json(await listFunders());
});

fundingRouter.get("/funding/matches", requireAuth, requireRole("founder"), async (req, res) => {
  res.json(await getMatches(req.user!.id));
});
