import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { app } from "../src/app.js";
import { toOpenApiPath } from "../src/docs/builder.js";
import { openapiSpec } from "../src/docs/openapi.js";
import { requireApproved, requireAuth } from "../src/middlewares/auth.js";
import { prisma } from "../src/shared/db.js";

// The API docs must not fall behind the code. These tests compare the
// routes actually registered on the Express app with the operations in
// the OpenAPI document, in both directions.

// The docs' own route, which the document does not describe.
const NOT_DOCUMENTED = new Set(["GET /openapi.json"]);

// What the walk needs of Express 5's router (the `router` package, 2.x).
// A layer made by .get()/.post() has `route`; one made by .use(router)
// has the router as its `handle`.
interface Layer {
  handle: unknown;
  slash: boolean;
  route?: { path: string | string[]; methods: Record<string, boolean>; stack: { handle: unknown }[] };
}

interface Registered {
  key: string;
  guards: unknown[];
}

function registeredRoutes(stack: Layer[]): Registered[] {
  const routes: Registered[] = [];
  for (const layer of stack) {
    if (layer.route) {
      assert.equal(typeof layer.route.path, "string", "a route registered with several paths or a pattern needs handling here");
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({
          key: `${method.toUpperCase()} ${toOpenApiPath(layer.route.path as string)}`,
          guards: layer.route.stack.map((l) => l.handle),
        });
      }
      continue;
    }
    const nested = (layer.handle as { stack?: Layer[] }).stack;
    if (Array.isArray(nested)) {
      // A layer does not keep the path it was mounted at, only whether
      // that was "/". Every router is mounted there today. One mounted
      // under a prefix would be listed here with the wrong paths.
      assert.ok(layer.slash, "a router is mounted under a path prefix: teach this walk to add the prefix");
      routes.push(...registeredRoutes(nested));
    }
  }
  return routes;
}

const METHODS = ["get", "post", "put", "patch", "delete"];

type Operation = (typeof openapiSpec.paths)[string][string] & {
  summary: string;
  tags: string[];
  security: unknown[];
  "x-access": { role: string | null; approved: boolean };
  parameters?: { name: string; in: string }[];
  responses: Record<string, unknown>;
};

const documented = new Map<string, Operation>();
for (const [path, item] of Object.entries(openapiSpec.paths)) {
  for (const method of METHODS) {
    if (item[method]) documented.set(`${method.toUpperCase()} ${path}`, item[method] as Operation);
  }
}

const registered = registeredRoutes((app as unknown as { router: { stack: Layer[] } }).router.stack).filter(
  (r) => !NOT_DOCUMENTED.has(r.key),
);

let base = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  // Importing the app opens the database pool, even though nothing here queries it.
  await prisma.$disconnect();
  server.close();
});

test("the walk finds the app's routes", () => {
  // Guards against the walk silently finding nothing, e.g. after an
  // Express upgrade changes the router's internals.
  assert.ok(registered.length > 100, `only ${registered.length} routes found`);
  assert.ok(registered.some((r) => r.key === "GET /health"));
  assert.ok(registered.some((r) => r.key === "PATCH /circles/{id}/members/{userId}"));
  assert.equal(new Set(registered.map((r) => r.key)).size, registered.length, "the same method and path is registered twice");
});

test("every registered route is documented", () => {
  const missing = registered.map((r) => r.key).filter((key) => !documented.has(key));
  assert.deepEqual(missing, [], "add these to the matching file in src/docs/paths");
});

test("every documented operation has a route", () => {
  const keys = new Set(registered.map((r) => r.key));
  const stale = [...documented.keys()].filter((key) => !keys.has(key));
  assert.deepEqual(stale, [], "remove these from src/docs/paths, or fix their method or path");
});

test("the documented access matches the route's guards", () => {
  for (const route of registered) {
    const op = documented.get(route.key);
    if (!op) continue;
    const needsToken = route.guards.includes(requireAuth);
    assert.equal(op.security.length > 0, needsToken, `${route.key}: bearer token`);
    assert.equal(op["x-access"].approved, route.guards.includes(requireApproved), `${route.key}: approved account`);
    // One way only: a public route can still answer 401, e.g. a wrong password.
    if (needsToken) assert.ok("401" in op.responses, `${route.key}: 401 response`);
  }
});

test("every operation is complete enough to read", () => {
  const tags = new Set(openapiSpec.tags.map((t) => t.name));
  for (const [key, op] of documented) {
    assert.ok(op.summary, `${key}: summary`);
    assert.ok(op.tags.every((t) => tags.has(t)), `${key}: unknown tag`);
    assert.ok(Object.keys(op.responses).some((status) => status.startsWith("2")), `${key}: success response`);

    const inPath = [...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const declared = (op.parameters ?? []).filter((p) => p.in === "path").map((p) => p.name);
    assert.deepEqual(declared, inPath, `${key}: path parameters`);
  }
});

test("every schema reference points at a schema that exists", () => {
  const text = JSON.stringify(openapiSpec);
  const names = new Set([...text.matchAll(/"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]!));
  const unknown = [...names].filter((name) => !(name in openapiSpec.components.schemas));
  assert.deepEqual(unknown, []);
});

test("the spec and the docs page are served without a token", async () => {
  const spec = await fetch(`${base}/openapi.json`);
  assert.equal(spec.status, 200);
  const body = (await spec.json()) as typeof openapiSpec;
  assert.equal(body.openapi, "3.1.0");
  assert.equal(Object.keys(body.paths).length, Object.keys(openapiSpec.paths).length);

  const page = await fetch(`${base}/docs/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await page.text(), /swagger-ui/);
});
