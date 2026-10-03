import { Router } from "express";
import { z } from "zod";
import { requireApproved, requireAuth } from "../../middlewares/auth.js";
import { listConnections, requestConnection, requestSchema, respond, respondSchema } from "../network/connections.js";
import {
  addMilestone,
  addParty,
  checklistSchema,
  confirmStage,
  createDeal,
  createSchema,
  getDeal,
  getDealChecklist,
  getTimeline,
  listDeals,
  milestonePatchSchema,
  milestoneSchema,
  partySchema,
  proposeStage,
  setDealStatus,
  setSharing,
  sharingSchema,
  stageSchema,
  statusSchema,
  termsSchema,
  updateDealChecklist,
  updateMilestone,
  updateTerms,
} from "./deals.service.js";

export const dealsRouter = Router();

// Connections and deals are between members, so every route here needs
// an approved account. Inside a deal, the service also checks that the
// caller is one of its parties.
const member = [requireAuth, requireApproved] as const;
const id = (value: unknown) => z.uuid().parse(value);

dealsRouter.post("/connections", ...member, async (req, res) => {
  res.status(201).json(await requestConnection(req.user!.id, requestSchema.parse(req.body)));
});

dealsRouter.get("/connections", ...member, async (req, res) => {
  res.json(await listConnections(req.user!.id));
});

dealsRouter.patch("/connections/:id", ...member, async (req, res) => {
  const { status } = respondSchema.parse(req.body);
  res.json(await respond(req.user!.id, id(req.params.id), status));
});

dealsRouter.post("/deals", ...member, async (req, res) => {
  res.status(201).json(await createDeal(req.user!.id, createSchema.parse(req.body)));
});

dealsRouter.get("/deals", ...member, async (req, res) => {
  res.json(await listDeals(req.user!.id));
});

dealsRouter.get("/deals/:id", ...member, async (req, res) => {
  res.json(await getDeal(req.user!.id, id(req.params.id)));
});

dealsRouter.post("/deals/:id/parties", ...member, async (req, res) => {
  res.json(await addParty(req.user!.id, id(req.params.id), partySchema.parse(req.body)));
});

dealsRouter.post("/deals/:id/stage", ...member, async (req, res) => {
  res.json(await proposeStage(req.user!.id, id(req.params.id), stageSchema.parse(req.body)));
});

dealsRouter.post("/deals/:id/stage/confirm", ...member, async (req, res) => {
  res.json(await confirmStage(req.user!.id, id(req.params.id)));
});

dealsRouter.post("/deals/:id/status", ...member, async (req, res) => {
  res.json(await setDealStatus(req.user!.id, id(req.params.id), statusSchema.parse(req.body)));
});

dealsRouter.patch("/deals/:id/terms", ...member, async (req, res) => {
  res.json(await updateTerms(req.user!.id, id(req.params.id), termsSchema.parse(req.body)));
});

dealsRouter.get("/deals/:id/timeline", ...member, async (req, res) => {
  res.json(await getTimeline(req.user!.id, id(req.params.id)));
});

dealsRouter.post("/deals/:id/milestones", ...member, async (req, res) => {
  res.status(201).json(await addMilestone(req.user!.id, id(req.params.id), milestoneSchema.parse(req.body)));
});

dealsRouter.patch("/deals/:id/milestones/:mid", ...member, async (req, res) => {
  const input = milestonePatchSchema.parse(req.body);
  res.json(await updateMilestone(req.user!.id, id(req.params.id), id(req.params.mid), input));
});

dealsRouter.patch("/deals/:id/sharing", ...member, async (req, res) => {
  const { share } = sharingSchema.parse(req.body);
  res.json(await setSharing(req.user!.id, id(req.params.id), share));
});

dealsRouter.get("/deals/:id/compliance", ...member, async (req, res) => {
  res.json(await getDealChecklist(req.user!.id, id(req.params.id)));
});

dealsRouter.patch("/deals/:id/compliance/:item_id", ...member, async (req, res) => {
  const input = checklistSchema.parse(req.body);
  res.json(await updateDealChecklist(req.user!.id, id(req.params.id), String(req.params.item_id), input));
});
