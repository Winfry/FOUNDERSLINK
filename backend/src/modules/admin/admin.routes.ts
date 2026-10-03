import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { applicationsQuery, getStats, getUser, listApplications, listUsers, usersQuery } from "./admin.service.js";

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
