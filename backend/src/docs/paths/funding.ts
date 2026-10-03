import { JOURNEY_TYPES } from "../../shared/constants.js";
import { anything, arr, bool, dateTime, described, int, nullable, obj, oneOf, ref, str, url, type Op } from "../builder.js";
import { APPROVAL_STATUS, ENGINE } from "../schemas.js";

export const tag = {
  name: "Funding",
  description: "Funder records and a founder's funding matches. Suggestions only: FounderLink does not hold or move money, and a match is not a guarantee of funding.",
};

export const ops: Op[] = [
  {
    method: "get",
    path: "/compliance/items",
    summary: "Compliance items for the onboarding tick list",
    description:
      "The business-scope compliance items, for the \"what you already have\" list in onboarding. Only the fields a form needs: internal ones, such as who owns an item and the rules that select it, are left out.",
    access: "public",
    ok: {
      description: "The items, by title.",
      schema: arr(obj({ id: str, title: str, why: nullable(str), institution: nullable(str) })),
    },
  },
  {
    method: "get",
    path: "/funders",
    summary: "List funder records",
    description:
      "Every funder record a founder may see: those built from public information, and those maintained by an investor who has been approved. Funders that fund groups are left out; a circle sees them at GET /circles/{id}/funding.",
    access: "user",
    ok: { description: "The records, by name.", schema: arr(ref("Funder")) },
  },
  {
    method: "get",
    path: "/funding/matches",
    summary: "My funding matches",
    description:
      "The founder's funders in three groups: `apply_now` (fits, nothing missing), `apply_after` (fits, with `gaps` to close first) and `not_for_you`.\n\nWhether a funder fits is decided by the AI service when she has agreed to `ai_matching` and the service answers. Otherwise the backend's rule-based stand-in decides and `engine` is `stand_in`. What stands between her and a funder (`gaps`, `risk_factors`) is always worked out by the backend with plain lookups.\n\nA founder who has not finished onboarding gets `PROFILE_REQUIRED`.",
    access: "founder",
    ok: {
      description: "The matches.",
      schema: obj({
        engine: ENGINE,
        journey_type: oneOf(JOURNEY_TYPES),
        approval_status: APPROVAL_STATUS,
        locked: described(
          nullable(obj({ investors: int, message: str })),
          "For a founder who is not approved: how many of her matches have an investor she could reach once she is.",
        ),
        apply_now: arr(ref("MatchCard")),
        apply_after: arr(ref("MatchCard")),
        not_for_you: arr(ref("MatchCard")),
        disclaimer: str,
      }),
    },
    errors: [[409, "PROFILE_REQUIRED", "The account has no founder profile yet."]],
  },
];
