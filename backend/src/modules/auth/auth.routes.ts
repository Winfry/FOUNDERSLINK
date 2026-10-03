import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { forbidden } from "../../shared/errors.js";
import { getMe, login, loginSchema, register, registerSchema } from "./auth.service.js";
import { enable, enableSchema, setup, verify, verifySchema } from "./two-factor.js";
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

// Two-step sign-in, for admins.

const adminOnly = (role: string) => {
  // Checked here, not with requireRole, so an admin can reach setup
  // even where two-step sign-in is already required everywhere else.
  if (role !== "admin") throw forbidden("Two-step sign-in is for admin accounts");
};

authRouter.post("/auth/2fa/setup", requireAuth, async (req, res) => {
  adminOnly(req.user!.role);
  res.json(await setup(req.user!.id));
});

authRouter.post("/auth/2fa/enable", requireAuth, async (req, res) => {
  adminOnly(req.user!.role);
  res.json(await enable(req.user!.id, enableSchema.parse(req.body).code));
});

authRouter.post("/auth/2fa/verify", async (req, res) => {
  res.json(await verify(verifySchema.parse(req.body)));
});
