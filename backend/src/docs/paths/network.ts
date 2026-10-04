import { mandateSchema } from "../../modules/funding/funder.schema.js";
import { expertProfileSchema, investorProfileSchema } from "../../modules/network/network.routes.js";
import { discoverSchema } from "../../modules/network/network.service.js";
import { portfolioPatchSchema, portfolioSchema, ventureSchema } from "../../modules/network/track-record.js";
import { JOURNEY_TYPES, PROFESSIONS } from "../../shared/constants.js";
import { arr, bool, described, int, nullable, obj, oneOf, ref, str, url, uuid, type Op } from "../builder.js";
import { ENGINE, ROLE } from "../schemas.js";

export const tag = {
  name: "Network",
  description: "Investor and expert profiles, track records, an investor's matching founders, and the profile page members see of each other.",
};

const BAND = oneOf(["strong", "good", "possible", "not_a_fit"]);
const signal = obj({ signal: str, fits: bool, text: str });

const profileBase = {
  id: uuid,
  full_name: str,
  role: ROLE,
  badges: arr(str),
  connection: described(
    obj({ id: nullable(uuid), status: oneOf(["none", "pending", "accepted", "declined", "withdrawn"]) }),
    "The connection between the viewer and this member. `none` when there is not one.",
  ),
  contact: ref("Contact"),
};

export const ops: Op[] = [
  {
    method: "put",
    path: "/me/investor-profile",
    summary: "Save the investor profile",
    description: "The person and the organisation she invests for. Changing the organisation after approval puts her on the admins' re-check list; she stays approved meanwhile.",
    access: "investor",
    body: investorProfileSchema,
    ok: { description: "The saved profile.", schema: ref("InvestorProfile") },
  },
  {
    method: "put",
    path: "/me/funder",
    summary: "Save what I fund",
    description:
      "Creates the funder record the investor maintains, or replaces it. Founders see it only once she is approved. `ticket_min_kes` must not be above `ticket_max_kes`; that rule is checked in code and is not in the schema below. `requirements` are compliance item ids.",
    access: "investor",
    body: mandateSchema,
    ok: { description: "The saved record.", schema: ref("FunderRecord") },
    errors: [
      [400, "UNKNOWN_COMPLIANCE_ITEM", "`requirements` contains an id that is not a compliance item."],
      [409, "FUNDER_NAME_TAKEN", "A funder record with this name exists and is not hers."],
      [409, "CLAIM_PENDING", "She asked in her vetting application to take over an existing record, and is not yet approved."],
    ],
  },
  {
    method: "get",
    path: "/investor/matches",
    summary: "Founders that fit my fund",
    description:
      "Approved founders who agreed to `profile_visibility` and fit the investor's funder record (or, before approval, the record she asked to take over). Filters narrow the matches and never widen them.\n\nAn investor who is not approved gets anonymised cards (`anonymised: true`): `headline`, `sector`, `stage`, `county`, `funding_amount_kes`, `band` and `ready` only. There is no name, business name, description or id until she is verified.\n\nEach founder is matched by the AI service only if that founder agreed to `ai_matching` and the service answers; otherwise by the rule-based stand-in. The response does not say which engine was used.",
    access: "investor",
    query: discoverSchema,
    ok: {
      description: "The matches.",
      schema: obj({
        approved: bool,
        count: int,
        message: str,
        founders: arr(
          obj({
            user_id: uuid,
            full_name: str,
            business_name: nullable(str),
            journey_type: oneOf(JOURNEY_TYPES),
            sector: str,
            stage: nullable(str),
            county: str,
            description: str,
            funding_amount_kes: nullable(int),
            use_of_funds: nullable(str),
            band: BAND,
            signals: arr(obj({ signal: str, fits: bool })),
            match_reasons: arr(str),
            ready: described(bool, "She already meets everything this funder requires."),
            anonymised: bool,
            headline: described(str, 'Only on an anonymised card, e.g. "Health startup, Nairobi, mvp, seeking KSh 1,000,000".'),
          }, ["user_id", "full_name", "business_name", "journey_type", "description", "use_of_funds", "signals", "match_reasons", "headline"]),
        ),
      }),
    },
    errors: [[409, "FUNDER_REQUIRED", "She has no funder record and has not asked to take one over."]],
  },
  {
    method: "post",
    path: "/me/portfolio",
    summary: "Add a past investment",
    description: "With `source_url` the entry is a `public` source; without it, `self_reported`. An entry can never be marked as verified by hand: that comes only from a deal closed on FounderLink.",
    access: "investor",
    body: portfolioSchema,
    ok: { status: 201, description: "The entry.", schema: ref("PortfolioEntry") },
  },
  {
    method: "patch",
    path: "/me/portfolio/:id",
    summary: "Edit a portfolio entry",
    description: "A field left out keeps its value. Only her own entries.",
    access: "investor",
    body: portfolioPatchSchema,
    ok: { description: "The entry.", schema: ref("PortfolioEntry") },
    errors: [
      [404, "NOT_FOUND", "No such entry, or it belongs to another investor."],
      [409, "VERIFIED_ENTRY", "The entry comes from a deal closed on FounderLink. Its visibility is set in the deal."],
    ],
  },
  {
    method: "put",
    path: "/me/expert-profile",
    summary: "Save the expert profile",
    description: "Profession, professional register, bio, what she offers and how many office-hours sessions she takes each month. Changing her profession or registration after approval puts her on the admins' re-check list.",
    access: "expert",
    body: expertProfileSchema,
    ok: { description: "The saved profile.", schema: ref("ExpertProfile") },
  },
  {
    method: "post",
    path: "/me/ventures",
    summary: "Add a previous venture",
    access: "founder",
    body: ventureSchema,
    ok: { status: 201, description: "The venture.", schema: ref("Venture") },
  },
  {
    method: "get",
    path: "/profiles/:id",
    summary: "A member's profile page",
    description:
      "What another approved member sees. The shape depends on the member's role: one of `investor`, `founder` or `expert` is present. `contact` is null until the two have an accepted connection.\n\nFor a founder viewing an investor, `fit` explains how well the investor's fund suits her business: by the AI service if the founder agreed to `ai_matching` and the service answers, otherwise by the rule-based stand-in (`fit.engine`).",
    access: "approved",
    ok: {
      description: "The profile.",
      schema: {
        oneOf: [
          obj({
            ...profileBase,
            investor: obj({ organisation_name: nullable(str), job_title: nullable(str), organisation_website: nullable(url), bio: nullable(str) }),
            funder: nullable(
              obj({
                id: uuid,
                name: str,
                kind: str,
                mandate_text: str,
                journey_types: arr(str),
                sectors: arr(str),
                stages: arr(str),
                counties: arr(str),
                instruments: arr(str),
                ticket_min_kes: int,
                ticket_max_kes: int,
              }),
            ),
            fit: described(
              nullable(obj({ band: BAND, components: arr(signal), reasons: arr(str), track_record_highlights: arr(str), engine: ENGINE })),
              "Only for a founder with a profile, viewing an investor who has said what she funds.",
            ),
            track_record: arr(ref("TrackRecordEntry")),
          }),
          obj({
            ...profileBase,
            founder: nullable(
              obj({
                business_name: nullable(str),
                journey_type: oneOf(JOURNEY_TYPES),
                sector: str,
                stage: nullable(str),
                county: str,
                description: str,
                funding_amount_kes: nullable(int),
                use_of_funds: nullable(str),
                year_started: nullable(int),
                website: nullable(url),
                social_links: arr(url),
              }),
            ),
            track_record: arr(
              obj({
                id: uuid,
                venture_name: str,
                sector: str,
                role: str,
                years: nullable(str),
                outcome: nullable(str),
                source: str,
                source_label: str,
                source_url: nullable(url),
              }),
            ),
          }),
          obj({
            ...profileBase,
            expert: nullable(
              obj({
                profession: oneOf(PROFESSIONS),
                organisation_name: nullable(str),
                register_body: nullable(str),
                bio: str,
                sectors: arr(str),
                counties: arr(str),
                services: arr(str),
                office_hours_per_month: int,
              }),
            ),
          }),
        ],
      },
    },
    errors: [[404, "NOT_FOUND", "No such member, she is not approved, or she has not agreed to `profile_visibility`. One answer for all three."]],
  },
];
