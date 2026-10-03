import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { listNotifications, markAllRead, markRead, sendDeadlineReminders } from "./notifications.service.js";

export const notificationsRouter = Router();

// A member's own notifications. No approval needed: the decision on her
// vetting application is itself a notification.

notificationsRouter.get("/notifications", requireAuth, async (req, res) => {
  res.json(await listNotifications(req.user!.id, req.query.unread === "true"));
});

notificationsRouter.post("/notifications/read-all", requireAuth, async (req, res) => {
  res.json(await markAllRead(req.user!.id));
});

notificationsRouter.post("/notifications/:id/read", requireAuth, async (req, res) => {
  res.json(await markRead(req.user!.id, z.uuid().parse(req.params.id)));
});

// The reminder job also runs on a timer. This lets an admin run it now.
notificationsRouter.post("/admin/jobs/deadline-reminders", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await sendDeadlineReminders());
});
