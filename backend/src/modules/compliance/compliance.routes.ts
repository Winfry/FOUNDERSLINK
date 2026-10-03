import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  ask,
  askSchema,
  deadlineSchema,
  feedbackSchema,
  getChecklist,
  getItem,
  giveFeedback,
  listDeadlines,
  setDeadline,
  sourcesReport,
  statusSchema,
  updateStatus,
} from "./compliance.service.js";

export const complianceRouter = Router();

const isFounder = requireRole("founder");

// The checklist is a founder's own data plus public information, so it
// does not need approval.

complianceRouter.get("/compliance", requireAuth, isFounder, async (req, res) => {
  res.json(await getChecklist(req.user!.id));
});

// Fixed paths come before "/compliance/:item_id", which would otherwise
// treat "deadlines" and "ask" as item ids.

complianceRouter.get("/compliance/deadlines", requireAuth, isFounder, async (req, res) => {
  res.json(await listDeadlines(req.user!.id));
});

complianceRouter.post("/compliance/ask", requireAuth, async (req, res) => {
  res.json(await ask(req.user!.id, askSchema.parse(req.body)));
});

complianceRouter.post("/compliance/questions/:id/feedback", requireAuth, async (req, res) => {
  const { feedback } = feedbackSchema.parse(req.body);
  res.json(await giveFeedback(req.user!.id, z.uuid().parse(req.params.id), feedback));
});

complianceRouter.get("/compliance/:item_id", requireAuth, isFounder, async (req, res) => {
  res.json(await getItem(req.user!.id, String(req.params.item_id)));
});

complianceRouter.patch("/compliance/:item_id/status", requireAuth, isFounder, async (req, res) => {
  res.json(await updateStatus(req.user!.id, String(req.params.item_id), statusSchema.parse(req.body)));
});

complianceRouter.put("/compliance/:item_id/deadline", requireAuth, isFounder, async (req, res) => {
  res.json(await setDeadline(req.user!.id, String(req.params.item_id), deadlineSchema.parse(req.body)));
});

complianceRouter.get("/admin/compliance/sources", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await sourcesReport());
});
