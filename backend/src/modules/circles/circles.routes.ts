import { Router } from "express";
import { z } from "zod";
import { requireApproved, requireAuth } from "../../middlewares/auth.js";
import { syncCircleRoom } from "../messaging/messaging.service.js";
import {
  checkSecret,
  confirmationSchema,
  importStatement,
  reconciliation,
  recordConfirmation,
  resolvePayment,
  resolveSchema,
  statementSchema,
} from "./mpesa.js";
import {
  addDecision,
  addGoal,
  addNote,
  closeDecision,
  contributionSchema,
  createCircle,
  createInvite,
  createSchema,
  decisionSchema,
  getCircle,
  goalPatchSchema,
  goalSchema,
  joinOpenCircle,
  joinSchema,
  joinWithInvite,
  listCircles,
  listContributions,
  listDecisions,
  listNotes,
  noteSchema,
  previewInvite,
  recordContribution,
  removeMember,
  roleSchema,
  setRole,
  suggestCircles,
  updateCircle,
  updateGoal,
  updateSchema,
  vote,
  voteSchema,
} from "./circles.service.js";

export const circlesRouter = Router();

// Circles are between members, so every route needs an approved account.
// The service then checks the caller's membership and role in the circle.
const approved = [requireAuth, requireApproved] as const;
const id = (value: unknown) => z.uuid().parse(value);

circlesRouter.post("/circles", ...approved, async (req, res) => {
  const circle = await createCircle(req.user!.id, createSchema.parse(req.body));
  await syncCircleRoom(circle.id);
  res.status(201).json(circle);
});

circlesRouter.get("/circles", ...approved, async (req, res) => {
  res.json(await listCircles(req.user!.id));
});

// Fixed paths come before "/circles/:id".

circlesRouter.get("/circles/suggested", ...approved, async (req, res) => {
  res.json(await suggestCircles(req.user!.id));
});

circlesRouter.get("/circles/invites/:token", ...approved, async (req, res) => {
  res.json(await previewInvite(String(req.params.token)));
});

circlesRouter.post("/circles/join", ...approved, async (req, res) => {
  const circle = await joinWithInvite(req.user!.id, joinSchema.parse(req.body).token);
  await syncCircleRoom(circle.id);
  res.json(circle);
});

circlesRouter.get("/circles/:id", ...approved, async (req, res) => {
  res.json(await getCircle(req.user!.id, id(req.params.id)));
});

circlesRouter.patch("/circles/:id", ...approved, async (req, res) => {
  res.json(await updateCircle(req.user!.id, id(req.params.id), updateSchema.parse(req.body)));
});

circlesRouter.post("/circles/:id/join", ...approved, async (req, res) => {
  const circle = await joinOpenCircle(req.user!.id, id(req.params.id));
  await syncCircleRoom(circle.id);
  res.json(circle);
});

circlesRouter.post("/circles/:id/invites", ...approved, async (req, res) => {
  res.status(201).json(await createInvite(req.user!.id, id(req.params.id)));
});

circlesRouter.delete("/circles/:id/members/:userId", ...approved, async (req, res) => {
  const result = await removeMember(req.user!.id, id(req.params.id), id(req.params.userId));
  // Leaving the circle also means leaving its chat.
  await syncCircleRoom(result.circle_id);
  res.json(result);
});

circlesRouter.patch("/circles/:id/members/:userId", ...approved, async (req, res) => {
  const { role } = roleSchema.parse(req.body);
  res.json(await setRole(req.user!.id, id(req.params.id), id(req.params.userId), role));
});

circlesRouter.post("/circles/:id/goals", ...approved, async (req, res) => {
  res.status(201).json(await addGoal(req.user!.id, id(req.params.id), goalSchema.parse(req.body)));
});

circlesRouter.patch("/circles/:id/goals/:goalId", ...approved, async (req, res) => {
  const input = goalPatchSchema.parse(req.body);
  res.json(await updateGoal(req.user!.id, id(req.params.id), id(req.params.goalId), input));
});

circlesRouter.post("/circles/:id/contributions", ...approved, async (req, res) => {
  res.status(201).json(await recordContribution(req.user!.id, id(req.params.id), contributionSchema.parse(req.body)));
});

circlesRouter.get("/circles/:id/contributions", ...approved, async (req, res) => {
  res.json(await listContributions(req.user!.id, id(req.params.id)));
});

circlesRouter.post("/circles/:id/notes", ...approved, async (req, res) => {
  res.status(201).json(await addNote(req.user!.id, id(req.params.id), noteSchema.parse(req.body)));
});

circlesRouter.get("/circles/:id/notes", ...approved, async (req, res) => {
  res.json(await listNotes(req.user!.id, id(req.params.id)));
});

circlesRouter.post("/circles/:id/decisions", ...approved, async (req, res) => {
  const { question } = decisionSchema.parse(req.body);
  res.status(201).json(await addDecision(req.user!.id, id(req.params.id), question));
});

circlesRouter.get("/circles/:id/decisions", ...approved, async (req, res) => {
  res.json(await listDecisions(req.user!.id, id(req.params.id)));
});

circlesRouter.post("/circles/:id/decisions/:decisionId/vote", ...approved, async (req, res) => {
  const { choice } = voteSchema.parse(req.body);
  res.json(await vote(req.user!.id, id(req.params.id), id(req.params.decisionId), choice));
});

circlesRouter.post("/circles/:id/decisions/:decisionId/close", ...approved, async (req, res) => {
  res.json(await closeDecision(req.user!.id, id(req.params.id), id(req.params.decisionId)));
});


// --- M-Pesa: reading what members paid into the circle's own account ---

circlesRouter.post("/circles/:id/statements", ...approved, async (req, res) => {
  res.json(await importStatement(req.user!.id, id(req.params.id), statementSchema.parse(req.body)));
});

circlesRouter.get("/circles/:id/reconciliation", ...approved, async (req, res) => {
  res.json(await reconciliation(req.user!.id, id(req.params.id)));
});

circlesRouter.patch("/circles/:id/payments/:paymentId", ...approved, async (req, res) => {
  const input = resolveSchema.parse(req.body);
  res.json(await resolvePayment(req.user!.id, id(req.params.id), id(req.params.paymentId), input));
});

// Called by Safaricom, not by a signed-in member, so it is guarded by a
// secret in the URL. It is off unless MPESA_CALLBACK_SECRET is set.
circlesRouter.post("/payments/mpesa/callback/:secret", async (req, res) => {
  checkSecret(String(req.params.secret));
  res.json(await recordConfirmation(confirmationSchema.parse(req.body)));
});
