import { Router } from "express";
import { z } from "zod";
import { requireApproved, requireAuth } from "../../middlewares/auth.js";
import {
  filterSchema,
  listExperts,
  listOfficeHours,
  requestOfficeHour,
  requestSchema,
  respondSchema,
  respondToOfficeHour,
} from "./experts.service.js";

export const expertsRouter = Router();

const member = [requireAuth, requireApproved] as const;
const id = (value: unknown) => z.uuid().parse(value);

expertsRouter.get("/experts", ...member, async (req, res) => {
  res.json(await listExperts(filterSchema.parse(req.query)));
});

expertsRouter.post("/experts/:id/office-hours", ...member, async (req, res) => {
  const { topic } = requestSchema.parse(req.body);
  res.status(201).json(await requestOfficeHour(req.user!.id, id(req.params.id), topic));
});

expertsRouter.get("/me/office-hours", ...member, async (req, res) => {
  res.json(await listOfficeHours(req.user!.id));
});

expertsRouter.patch("/office-hours/:id", ...member, async (req, res) => {
  const { status } = respondSchema.parse(req.body);
  res.json(await respondToOfficeHour(req.user!.id, id(req.params.id), status));
});
