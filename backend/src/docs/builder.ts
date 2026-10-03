// Turns a short description of each route into an OpenAPI operation.
//
// Request bodies and query strings are passed in as the same Zod schemas
// the routers parse with, so the documented shape is the validated one.
// Responses are not validated anywhere, so their schemas are written by
// hand in schemas.ts and in the files under paths/.

import { z } from "zod";

export type Schema = Record<string, unknown>;

// --- Shorthand for hand-written schemas ---

export const str: Schema = { type: "string" };
export const int: Schema = { type: "integer" };
export const num: Schema = { type: "number" };
export const bool: Schema = { type: "boolean" };
export const uuid: Schema = { type: "string", format: "uuid" };
export const dateTime: Schema = { type: "string", format: "date-time" };
export const url: Schema = { type: "string", format: "uri" };
export const anything: Schema = {};

export const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: "null" }] });
export const oneOf = (values: readonly string[]): Schema => ({ type: "string", enum: [...values] });
export const arr = (items: Schema): Schema => ({ type: "array", items });
export const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
export const described = (schema: Schema, description: string): Schema => ({ ...schema, description });

// Every property is required unless named in `optional`: a response
// always carries its keys, with null for "nothing".
export function obj(properties: Record<string, Schema>, optional: string[] = []): Schema {
  const required = Object.keys(properties).filter((key) => !optional.includes(key));
  return { type: "object", properties, ...(required.length > 0 ? { required } : {}) };
}

// --- From Zod ---

// What the endpoint accepts, i.e. the schema's input side: a field with
// a default is optional, and a transform is described by what goes in.
// Refinements across fields cannot be expressed and are left out, so an
// operation that has one says so in its description.
export function fromZod(schema: z.ZodType): Schema {
  const { $schema: _dialect, ...json } = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      // z.coerce.date() takes whatever `new Date()` can read.
      if (zodSchema._zod.def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
      }
      // The format already says it. The patterns Zod adds are long and add nothing.
      if (jsonSchema.format === "uuid" || jsonSchema.format === "email") delete jsonSchema.pattern;
      if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum;
      if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum;
    },
  });
  return json;
}

// --- Operations ---

// Which middleware guards the route.
//   public    none
//   user      requireAuth
//   approved  requireAuth + requireApproved
//   a role    requireAuth + requireRole(role)
export type Access = "public" | "user" | "approved" | "founder" | "investor" | "expert" | "admin";

export type Method = "get" | "post" | "put" | "patch" | "delete";

// [status, code, when it happens]
export type ErrorCase = [number, string, string];

export interface Op {
  method: Method;
  // As registered with Express, e.g. "/circles/:id".
  path: string;
  summary: string;
  description?: string;
  access: Access;
  // Path parameters that are not UUIDs. One left out is documented as a
  // UUID, which the routers check with z.uuid().
  params?: Record<string, Schema>;
  query?: z.ZodType | Parameter[];
  body?: z.ZodType;
  // Used in place of `body` where the body is not JSON.
  requestBody?: Schema;
  ok: { status?: number; description: string; schema?: Schema; content?: Schema };
  // More success responses, by status.
  alsoOk?: Record<number, { description: string; schema?: Schema }>;
  errors?: ErrorCase[];
}

export interface Parameter {
  name: string;
  in: "query" | "path";
  required: boolean;
  description?: string;
  schema: Schema;
}

const ROLES = ["founder", "investor", "expert", "admin"];

const ACCESS_TEXT: Record<Access, string> = {
  public: "No token needed.",
  user: "Bearer token. Any signed-in account, approved or not.",
  approved: "Bearer token, and the account must be approved.",
  founder: "Bearer token, `founder` role. Approval is not needed.",
  investor: "Bearer token, `investor` role. Approval is not needed.",
  expert: "Bearer token, `expert` role. Approval is not needed.",
  admin: "Bearer token, `admin` role.",
};

export const toOpenApiPath = (path: string) => path.replace(/:(\w+)/g, "{$1}");

function pathParameters(op: Op): Parameter[] {
  return [...op.path.matchAll(/:(\w+)/g)].map(([, name]) => ({
    name: name!,
    in: "path",
    required: true,
    schema: op.params?.[name!] ?? uuid,
  }));
}

function queryParameters(query: Op["query"]): Parameter[] {
  if (!query) return [];
  if (Array.isArray(query)) return query;
  const json = fromZod(query) as { properties?: Record<string, Schema>; required?: string[] };
  return Object.entries(json.properties ?? {}).map(([name, schema]) => ({
    name,
    in: "query",
    required: json.required?.includes(name) ?? false,
    schema,
  }));
}

// The errors every route with this guard and this kind of input can
// return, before the ones particular to it.
function sharedErrors(op: Op, parameters: Parameter[]): ErrorCase[] {
  const errors: ErrorCase[] = [];
  const validated = op.body || (op.query && !Array.isArray(op.query)) || parameters.some((p) => p.in === "path" && p.schema.format === "uuid");
  if (validated) errors.push([400, "VALIDATION_ERROR", "A field is missing or invalid. `fields` says which."]);
  if (op.body) errors.push([400, "INVALID_JSON", "The body is not valid JSON."]);
  if (op.access !== "public") errors.push([401, "UNAUTHORIZED", "No bearer token, or the session has expired."]);
  if (op.access === "approved") errors.push([403, "APPROVAL_REQUIRED", "The account is not approved (or has been suspended)."]);
  if (ROLES.includes(op.access)) errors.push([403, "FORBIDDEN", `The account does not have the \`${op.access}\` role.`]);
  if (op.access === "admin") {
    errors.push([403, "TWO_FACTOR_REQUIRED", "`ADMIN_2FA_REQUIRED` is on and this session was not signed into with an authenticator code."]);
  }
  return errors;
}

const json = (schema: Schema) => ({ "application/json": { schema } });

export function toOperation(op: Op, tag: string) {
  const parameters = [...pathParameters(op), ...queryParameters(op.query)];
  const errors = [...sharedErrors(op, parameters), ...(op.errors ?? [])];

  const responses: Record<string, unknown> = {};
  const successes = { [op.ok.status ?? 200]: op.ok, ...op.alsoOk };
  for (const [status, ok] of Object.entries(successes)) {
    const content = "content" in ok && ok.content ? ok.content : ok.schema ? json(ok.schema) : undefined;
    responses[status] = { description: ok.description, ...(content ? { content } : {}) };
  }
  for (const status of [...new Set(errors.map(([s]) => s))].sort()) {
    const cases = errors.filter(([s]) => s === status);
    responses[status] = {
      description: cases.map(([, code, when]) => `\`${code}\`: ${when}`).join("\n\n"),
      content: json(ref("Error")),
    };
  }

  const words = `${op.method} ${op.path}`.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return {
    tags: [tag],
    operationId: words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(""),
    summary: op.summary,
    description: [op.description, `**Access:** ${ACCESS_TEXT[op.access]}`].filter(Boolean).join("\n\n"),
    // An empty list means "no security", overriding nothing: there is no global default.
    security: op.access === "public" ? [] : [{ bearerAuth: [] }],
    "x-access": {
      role: ROLES.includes(op.access) ? op.access : null,
      approved: op.access === "approved",
    },
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(op.body ? { requestBody: { required: true, content: json(fromZod(op.body)) } } : {}),
    ...(op.requestBody ? { requestBody: op.requestBody } : {}),
    responses,
  };
}
