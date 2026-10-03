import { extractSchema } from "../../modules/profile/profile.routes.js";
import { profileSchema } from "../../modules/profile/profile.schema.js";
import { arr, described, obj, ref, str, type Op } from "../builder.js";
import { ENGINE } from "../schemas.js";

export const tag = { name: "Profile", description: "The founder's onboarding answers." };

export const ops: Op[] = [
  {
    method: "put",
    path: "/me/profile",
    summary: "Save the founder profile",
    description:
      "Saves the onboarding answers, replacing the whole profile. `journey_type` decides which fields are required: a `startup` needs `stage`; an `sme` needs `months_trading`, `monthly_revenue_band` and `has_employees`. Switching path clears the other path's fields.\n\nEach id in `already_have` is marked complete on her compliance checklist. Leaving one out later does not undo it.\n\nThe founder role is checked in the handler.",
    access: "user",
    body: profileSchema,
    ok: { description: "The saved profile.", schema: ref("FounderProfileWithProgress") },
    errors: [
      [400, "UNKNOWN_COMPLIANCE_ITEM", "`already_have` contains an id that is not a business compliance item."],
      [403, "FORBIDDEN", "The account is not a founder."],
      [409, "CONSENT_REQUIRED", "`women_owned`, `youth_owned` or `pwd_owned` was sent without the `eligibility_attributes` consent."],
    ],
  },
  {
    method: "post",
    path: "/me/profile/extract",
    summary: "Suggest profile fields from a description",
    description:
      "Turns a typed description of the business into suggested onboarding fields. Saves nothing: the founder reviews them and submits PUT /me/profile.\n\nThe text goes to the AI service only if she has agreed to `ai_matching`, with emails and phone numbers removed first. Otherwise, or when no AI service is configured or the call fails, a rule-based stand-in answers and `engine` is `stand_in`. The stand-in works from keywords and suggests far fewer fields.",
    access: "founder",
    body: extractSchema,
    ok: {
      description: "Suggestions.",
      schema: obj({
        fields: described(
          { type: "object", additionalProperties: true },
          "Any of `journey_type`, `business_status`, `sector`, `county`, `funding_amount_kes`, `use_of_funds`, `stage`, `instruments`, `months_trading`, `monthly_revenue_band`, `has_employees`, `handles_personal_data`, each with a value PUT /me/profile would accept.",
        ),
        unsure: described(arr(str), "Fields the engine was not sure of, or suggested with a value that is not valid."),
        engine: ENGINE,
      }),
    },
  },
];
