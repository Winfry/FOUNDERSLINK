import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { circlesRouter } from "./modules/circles/circles.routes.js";
import { complianceRouter } from "./modules/compliance/compliance.routes.js";
import { dealsRouter } from "./modules/deals/deals.routes.js";
import { fundingRouter } from "./modules/funding/funding.routes.js";
import { messagingRouter } from "./modules/messaging/messaging.routes.js";
import { networkRouter } from "./modules/network/network.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { vettingRouter } from "./modules/vetting/vetting.routes.js";
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
    counties: options.COUNTIES,
    eligibility_flags: options.ELIGIBILITY_FLAGS,
    signup_roles: options.SIGNUP_ROLES,
    funder_kinds: options.FUNDER_KINDS,
    professions: options.PROFESSIONS,
    check_types: options.CHECK_TYPES,
  });
});

app.use(authRouter);
app.use(profileRouter);
app.use(fundingRouter);
app.use(complianceRouter);
app.use(vettingRouter);
app.use(networkRouter);
app.use(dealsRouter);
app.use(messagingRouter);
app.use(circlesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "No such endpoint" } });
});

app.use(errorHandler);
