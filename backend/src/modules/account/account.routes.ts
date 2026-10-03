import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  codeSchema,
  deleteAccount,
  deleteSchema,
  exportData,
  sendPhoneCode,
  settingsSchema,
  updateSettings,
  verifyPhoneCode,
} from "./account.service.js";
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

accountRouter.patch("/me", requireAuth, async (req, res) => {
  res.json(await updateSettings(req.user!.id, settingsSchema.parse(req.body)));
});

accountRouter.post("/me/phone/code", requireAuth, async (req, res) => {
  res.json(await sendPhoneCode(req.user!.id));
});

accountRouter.post("/me/phone/verify", requireAuth, async (req, res) => {
  res.json(await verifyPhoneCode(req.user!.id, codeSchema.parse(req.body).code));
});
