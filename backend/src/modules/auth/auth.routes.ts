import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { getMe, login, loginSchema, register, registerSchema } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
  res.status(201).json(await register(registerSchema.parse(req.body)));
});

authRouter.post("/auth/login", async (req, res) => {
  res.json(await login(loginSchema.parse(req.body)));
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json(await getMe(req.user!.id));
});
