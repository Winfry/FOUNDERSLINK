// The OpenAPI document served at GET /openapi.json and shown at GET /docs.
//
// One file under paths/ per router. test/openapi.test.ts walks the
// routes registered on the Express app and fails if one is missing here,
// or if an operation here has no route.

import { toOpenApiPath, toOperation, type Op } from "./builder.js";
import * as account from "./paths/account.js";
import * as admin from "./paths/admin.js";
import * as auth from "./paths/auth.js";
import * as circles from "./paths/circles.js";
import * as compliance from "./paths/compliance.js";
import * as deals from "./paths/deals.js";
import * as experts from "./paths/experts.js";
import * as funding from "./paths/funding.js";
import * as messaging from "./paths/messaging.js";
import * as meta from "./paths/meta.js";
import * as network from "./paths/network.js";
import * as notifications from "./paths/notifications.js";
import * as profile from "./paths/profile.js";
import * as vetting from "./paths/vetting.js";
import { components } from "./schemas.js";

// In the order the tags should read in the UI.
const modules: { tag: { name: string; description: string }; ops: Op[] }[] = [
  meta,
  auth,
  account,
  profile,
  funding,
  compliance,
  vetting,
  admin,
  network,
  deals,
  messaging,
  circles,
  experts,
  notifications,
];

const DESCRIPTION = `
The HTTP API of the FounderLink backend. Each tag is one router under \`src/modules\`, so an operation is listed under the router that registers it.

## Signing in

Send the token from \`POST /auth/login\` or \`POST /auth/register\` as \`Authorization: Bearer <token>\`. A token lasts 7 days. Each operation says under **Access** what it needs:

- a bearer token;
- for some, a role (\`founder\`, \`investor\`, \`expert\`, \`admin\`);
- for anything that shows one member to another, an **approved** account. The status is read from the database on every request, so a suspension takes effect at once. Otherwise the answer is \`403\` with code \`APPROVAL_REQUIRED\`.

## Errors

Every error is \`{ "error": { "code", "message" } }\`. Branch on \`code\`. A validation error (\`400 VALIDATION_ERROR\`) also carries \`fields: [{ path, message }]\`. An unknown path answers \`404 NOT_FOUND\`, and anything unexpected \`500 INTERNAL_ERROR\`; those two are not repeated on each operation. JSON bodies are limited to 100 kB (1 MB for a statement upload); a larger one answers \`413 PAYLOAD_TOO_LARGE\`.

## What this backend does not do

Stated here once, and again on the operations concerned:

- **AI.** Matching, profile extraction, the compliance checklist and answers, vetting risk signals and the message scam check call a separate AI service. When none is configured (\`AI_SERVICE_URL\`), or a call fails, times out or returns something invalid, a rule-based stand-in in \`src/ai/standin.ts\` answers instead. It is plain rules, not AI. Responses that carry an \`engine\` field say which one answered: \`ai_service\` or \`stand_in\`.
- **SMS.** No SMS provider is configured. Phone codes and SMS notifications are not sent. Outside production, the response that would have sent a code returns it as \`dev_code\`.
- **Email** goes through Resend and, until a sending domain is verified there, reaches only the address that owns the Resend account. Unsent email codes are also returned as \`dev_code\` outside production.
- **M-Pesa.** The statement import and the Paybill confirmation endpoint have never been run against a real M-Pesa statement or Safaricom's sandbox.
- **Uploaded files** are stored on the server's local disk and are not encrypted.
- **Money.** FounderLink never holds or moves money. Circles, contributions and deal terms are records of what members say happened.

## Live delivery (WebSocket)

OpenAPI cannot describe it, so it is described here. Open a WebSocket to \`/ws\` and send \`{"type": "auth", "token": "<jwt>"}\` as the first message, within 5 seconds. The server answers \`{"type": "ready"}\`, then pushes \`{"type": "message", "message": {...}}\` for each new message in the member's conversations and \`{"type": "notification", "notification": {...}}\` for each new notification. The socket only receives: sending is done over REST. Anyone signed in may connect, so someone waiting to be vetted still gets her notifications. Chat messages are pushed only while the member is approved. A bad token or a missing auth message closes the socket with code \`4401\`.
`.trim();

function build() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const { tag, ops } of modules) {
    for (const op of ops) {
      const path = toOpenApiPath(op.path);
      paths[path] ??= {};
      if (paths[path][op.method]) throw new Error(`Documented twice: ${op.method.toUpperCase()} ${op.path}`);
      paths[path][op.method] = toOperation(op, tag.name);
    }
  }

  return {
    openapi: "3.1.0",
    info: { title: "FounderLink API", version: "0.1.0", description: DESCRIPTION },
    // Relative, so "Try it out" calls whichever host is serving the docs.
    servers: [{ url: "/" }],
    tags: modules.map((m) => m.tag),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "The `token` from POST /auth/login or POST /auth/register." },
      },
      schemas: components,
    },
  };
}

export const openapiSpec = build();
