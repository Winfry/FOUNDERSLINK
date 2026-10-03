import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  applicationSchema,
  decide,
  decisionSchema,
  getApplication,
  getApplicationForReview,
  getQueue,
  listAdminActions,
  reasonSchema,
  saveApplication,
  setSuspended,
  submitApplication,
} from "./vetting.service.js";

export const vettingRouter = Router();

const id = (value: unknown) => z.uuid().parse(value);

// The applicant's side.

vettingRouter.get("/vetting/application", requireAuth, async (req, res) => {
  res.json(await getApplication(req.user!.id));
});

vettingRouter.patch("/vetting/application", requireAuth, async (req, res) => {
  res.json(await saveApplication(req.user!.id, applicationSchema.parse(req.body)));
});

vettingRouter.post("/vetting/application/submit", requireAuth, async (req, res) => {
  res.json(await submitApplication(req.user!.id));
});

// The admin's side. Every route below needs the admin role.

const isAdmin = requireRole("admin");

vettingRouter.get("/admin/vetting/queue", requireAuth, isAdmin, async (_req, res) => {
  res.json(await getQueue());
});

vettingRouter.get("/admin/vetting/:id", requireAuth, isAdmin, async (req, res) => {
  res.json(await getApplicationForReview(id(req.params.id)));
});

vettingRouter.post("/admin/vetting/:id/decision", requireAuth, isAdmin, async (req, res) => {
  res.json(await decide(req.user!.id, id(req.params.id), decisionSchema.parse(req.body)));
});

vettingRouter.post("/admin/users/:id/suspend", requireAuth, isAdmin, async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  res.json(await setSuspended(req.user!.id, id(req.params.id), true, reason));
});

vettingRouter.post("/admin/users/:id/reinstate", requireAuth, isAdmin, async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  res.json(await setSuspended(req.user!.id, id(req.params.id), false, reason));
});

vettingRouter.get("/admin/actions", requireAuth, isAdmin, async (_req, res) => {
  res.json(await listAdminActions());
});
