import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { activity, addTask, ask, askSchema, decide, listTasks, taskSchema } from "./copilot.service.js";

export const copilotRouter = Router();

// The Founder Copilot is for founders. Every route works on the signed-in
// founder's own records; there is no id of another member to pass.
const founder = [requireAuth, requireRole("founder")] as const;
const id = (value: unknown) => z.uuid().parse(value);

copilotRouter.post("/copilot/ask", ...founder, async (req, res) => {
  res.json(await ask(req.user!.id, askSchema.parse(req.body)));
});

copilotRouter.get("/copilot/tasks", ...founder, async (req, res) => {
  res.json(await listTasks(req.user!.id));
});

copilotRouter.post("/copilot/tasks", ...founder, async (req, res) => {
  res.status(201).json(await addTask(req.user!.id, taskSchema.parse(req.body)));
});

for (const action of ["approve", "dismiss", "done", "reopen"] as const) {
  copilotRouter.post(`/copilot/tasks/:id/${action}`, ...founder, async (req, res) => {
    res.json(await decide(req.user!.id, id(req.params.id), action));
  });
}

copilotRouter.get("/copilot/activity", ...founder, async (req, res) => {
  res.json(await activity(req.user!.id));
});
