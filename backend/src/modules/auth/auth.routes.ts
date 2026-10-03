import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { getMe, login, loginSchema, register, registerSchema } from "./auth.service.js";
import {
  codeSchema,
  forgotPassword,
  forgotSchema,
  resendVerificationCode,
  resetPassword,
  resetSchema,
  verifyEmail,
} from "./email-codes.js";

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

authRouter.post("/auth/email/code", requireAuth, async (req, res) => {
  res.json(await resendVerificationCode(req.user!.id));
});

authRouter.post("/auth/email/verify", requireAuth, async (req, res) => {
  res.json(await verifyEmail(req.user!.id, codeSchema.parse(req.body).code));
});

authRouter.post("/auth/password/forgot", async (req, res) => {
  res.json(await forgotPassword(forgotSchema.parse(req.body).email));
});

authRouter.post("/auth/password/reset", async (req, res) => {
  res.json(await resetPassword(resetSchema.parse(req.body)));
});
