import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import * as options from "./shared/constants.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Option lists for the onboarding form.
app.get("/meta/options", (_req, res) => {
  res.json({
    journey_types: options.JOURNEY_TYPES,
    business_statuses: options.BUSINESS_STATUSES,
    sectors: options.SECTORS,
    stages: options.STAGES,
    instruments: options.INSTRUMENTS,
    revenue_bands: options.REVENUE_BANDS,
  });
});

app.use(authRouter);
app.use(profileRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "No such endpoint" } });
});

app.use(errorHandler);
