import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  applicationsQuery,
  createAdmin,
  getStats,
  getUser,
  listAdmins,
  listApplications,
  listUsers,
  newAdminSchema,
  usersQuery,
} from "./admin.service.js";

export const adminRouter = Router();

// Every route here is for admins only.
const admin = [requireAuth, requireRole("admin")] as const;

adminRouter.get("/admin/stats", ...admin, async (_req, res) => {
  res.json(await getStats());
});

adminRouter.get("/admin/users", ...admin, async (req, res) => {
  res.json(await listUsers(usersQuery.parse(req.query)));
});

adminRouter.get("/admin/users/:id", ...admin, async (req, res) => {
  res.json(await getUser(z.uuid().parse(req.params.id)));
});

adminRouter.get("/admin/vetting/applications", ...admin, async (req, res) => {
  res.json(await listApplications(applicationsQuery.parse(req.query)));
});

adminRouter.get("/admin/admins", ...admin, async (_req, res) => {
  res.json(await listAdmins());
});

adminRouter.post("/admin/admins", ...admin, async (req, res) => {
  res.status(201).json(await createAdmin(req.user!.id, newAdminSchema.parse(req.body)));
});
