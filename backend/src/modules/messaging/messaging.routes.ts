import { Router } from "express";
import { z } from "zod";
import { requireApproved, requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  listConversations,
  listMessages,
  listReports,
  markRead,
  openDirect,
  openSchema,
  pageSchema,
  reportMessage,
  reportSchema,
  sendMessage,
  sendSchema,
  setBlocked,
} from "./messaging.service.js";

export const messagingRouter = Router();

// Messaging is between members, so every route needs an approved
// account. The service then checks the caller is in the conversation.
const member = [requireAuth, requireApproved] as const;
const id = (value: unknown) => z.uuid().parse(value);

messagingRouter.get("/conversations", ...member, async (req, res) => {
  res.json(await listConversations(req.user!.id));
});

messagingRouter.post("/conversations", ...member, async (req, res) => {
  const conversation = await openDirect(req.user!.id, openSchema.parse(req.body).user_id);
  res.status(conversation.created ? 201 : 200).json(conversation);
});

messagingRouter.get("/conversations/:id/messages", ...member, async (req, res) => {
  res.json(await listMessages(req.user!.id, id(req.params.id), pageSchema.parse(req.query)));
});

messagingRouter.post("/conversations/:id/messages", ...member, async (req, res) => {
  const { body } = sendSchema.parse(req.body);
  res.status(201).json(await sendMessage(req.user!.id, id(req.params.id), body));
});

messagingRouter.post("/conversations/:id/read", ...member, async (req, res) => {
  res.json(await markRead(req.user!.id, id(req.params.id)));
});

messagingRouter.post("/messages/:id/report", ...member, async (req, res) => {
  const { reason } = reportSchema.parse(req.body);
  res.status(201).json(await reportMessage(req.user!.id, id(req.params.id), reason));
});

messagingRouter.put("/users/:id/block", ...member, async (req, res) => {
  res.json(await setBlocked(req.user!.id, id(req.params.id), true));
});

messagingRouter.delete("/users/:id/block", ...member, async (req, res) => {
  res.json(await setBlocked(req.user!.id, id(req.params.id), false));
});

messagingRouter.get("/admin/reports", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await listReports());
});
