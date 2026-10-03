import { arr, obj, oneOf, str, type Op } from "../builder.js";

export const tag = { name: "Meta", description: "Liveness and the option lists for forms. Defined in `src/app.ts`." };

const LISTS = [
  "journey_types",
  "business_statuses",
  "sectors",
  "stages",
  "instruments",
  "revenue_bands",
  "counties",
  "eligibility_flags",
  "signup_roles",
  "consent_purposes",
  "funder_kinds",
  "professions",
  "check_types",
];

export const ops: Op[] = [
  {
    method: "get",
    path: "/health",
    summary: "Liveness check",
    description: "Says the process is up. It does not check the database.",
    access: "public",
    ok: { description: "The server is running.", schema: obj({ status: oneOf(["ok"]) }) },
  },
  {
    method: "get",
    path: "/meta/options",
    summary: "Option lists for forms",
    description:
      "Every list of values the API accepts (sectors, stages, counties and so on), so a client does not hardcode them. Each list is given twice: the bare values, and under `labels` the same values as `{ id, label }` pairs to show.",
    access: "public",
    ok: {
      description: "The lists.",
      schema: obj({
        ...Object.fromEntries(LISTS.map((name) => [name, arr(str)])),
        labels: obj(Object.fromEntries(LISTS.map((name) => [name, arr(obj({ id: str, label: str }))]))),
      }),
    },
  },
];
