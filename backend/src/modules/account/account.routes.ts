import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { deleteAccount, deleteSchema, exportData } from "./account.service.js";
import { consentSchema, listConsents, setConsent } from "./consents.js";

export const accountRouter = Router();

// A person's own data and choices. None of this needs approval: these
// are her rights from the moment she signs up.

accountRouter.get("/me/consents", requireAuth, async (req, res) => {
  res.json(await listConsents(req.user!.id));
});

accountRouter.post("/me/consents", requireAuth, async (req, res) => {
  res.json(await setConsent(req.user!.id, consentSchema.parse(req.body)));
});

accountRouter.get("/me/export", requireAuth, async (req, res) => {
  res.setHeader("Content-Disposition", 'attachment; filename="founderlink-my-data.json"');
  res.json(await exportData(req.user!.id));
});

accountRouter.delete("/me", requireAuth, async (req, res) => {
  res.json(await deleteAccount(req.user!.id, deleteSchema.parse(req.body).password));
});
