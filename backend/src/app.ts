import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openapiSpec } from "./docs/openapi.js";
import { errorHandler } from "./middlewares/error.js";
import { accountRouter } from "./modules/account/account.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { circlesRouter } from "./modules/circles/circles.routes.js";
import { complianceRouter } from "./modules/compliance/compliance.routes.js";
import { dealsRouter } from "./modules/deals/deals.routes.js";
import { expertsRouter } from "./modules/experts/experts.routes.js";
import { fundingRouter } from "./modules/funding/funding.routes.js";
import { messagingRouter } from "./modules/messaging/messaging.routes.js";
import { networkRouter } from "./modules/network/network.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { vettingRouter } from "./modules/vetting/vetting.routes.js";
import * as options from "./shared/constants.js";

export const app = express();

// One line per request while developing: what was asked, from where,
// and how it ended. Never the body, so no password or token is logged.
if (env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      const from = req.headers.origin ?? req.headers["user-agent"]?.slice(0, 40) ?? "unknown";
      console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms ${req.ip} ${from}`);
    });
    next();
  });
}

app.use(cors({ origin: env.CORS_ORIGIN.split(",") }));
// A statement upload carries a whole statement as text, so it alone may
// be larger than an ordinary request.
const smallBody = express.json({ limit: "100kb" });
const statementBody = express.json({ limit: "1mb" });
app.use((req, res, next) => (/^\/circles\/[^/]+\/statements$/.test(req.path) ? statementBody : smallBody)(req, res, next));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Option lists for forms. Each list is given twice: the bare values the
// API accepts, and the same values with a label to show.
app.get("/meta/options", (_req, res) => {
  const lists = {
    journey_types: options.JOURNEY_TYPES,
    business_statuses: options.BUSINESS_STATUSES,
    sectors: options.SECTORS,
    stages: options.STAGES,
    instruments: options.INSTRUMENTS,
    revenue_bands: options.REVENUE_BANDS,
    counties: options.COUNTIES,
    eligibility_flags: options.ELIGIBILITY_FLAGS,
    signup_roles: options.SIGNUP_ROLES,
    consent_purposes: options.CONSENT_PURPOSES,
    funder_kinds: options.FUNDER_KINDS,
    professions: options.PROFESSIONS,
    check_types: options.CHECK_TYPES,
  };
  const labels = Object.fromEntries(Object.entries(lists).map(([name, values]) => [name, options.labelled(values)]));
  res.json({ ...lists, labels });
});

app.use(authRouter);
app.use(accountRouter);
app.use(profileRouter);
app.use(fundingRouter);
app.use(complianceRouter);
// Before the vetting router, whose "/admin/vetting/:id" would otherwise
// read "applications" as an id.
app.use(adminRouter);
app.use(vettingRouter);
app.use(networkRouter);
app.use(dealsRouter);
app.use(messagingRouter);
app.use(circlesRouter);
app.use(expertsRouter);
app.use(notificationsRouter);

// API documentation. The spec is built from the routers' own Zod schemas
// (src/docs), and test/openapi.test.ts fails if it misses a route.
app.get("/openapi.json", (_req, res) => {
  res.json(openapiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: "FounderLink API" }));

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "No such endpoint" } });
});

app.use(errorHandler);
