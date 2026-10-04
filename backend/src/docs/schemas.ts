// Response shapes, written by hand from what each service returns.
// Nothing checks a response against these at run time, so when a service
// changes what it returns, change it here too.

import {
  BUSINESS_STATUSES,
  CHECK_METHODS,
  CHECK_TYPES,
  CONSENT_PURPOSES,
  FUNDER_KINDS,
  JOURNEY_TYPES,
  PROFESSIONS,
} from "../shared/constants.js";
import { DEAL_TYPES, STAGES as DEAL_STAGES } from "../modules/deals/deals.service.js";
import { DOCUMENT_TYPES } from "../modules/vetting/documents.js";
import { arr, bool, dateTime, described, int, nullable, obj, oneOf, ref, str, url, uuid, type Schema } from "./builder.js";

export const ROLE = oneOf(["founder", "investor", "expert", "admin"]);
export const APPROVAL_STATUS = oneOf(["draft", "submitted", "in_review", "needs_info", "approved", "rejected", "suspended", "banned"]);
export const ENGINE = described(
  oneOf(["ai_service", "stand_in"]),
  "`ai_service` when the AI service answered. `stand_in` when the backend's own rule-based fallback did: no AI service is configured, the call failed or timed out, or the member has not agreed to `ai_matching`.",
);
const COMPLIANCE_STATUS = oneOf(["not_started", "in_progress", "complete"]);
const SEND_STATUS = oneOf(["sent", "not_configured", "failed"]);
const DEV_CODE = described(str, "The code itself. Present only when it could not be delivered and `NODE_ENV` is not `production`, so the flow can be shown without a provider.");

export const person = obj({ id: uuid, full_name: str });
const personWithRole = obj({ id: uuid, full_name: str, role: ROLE });
export const progress = obj({ done: int, total: int, text: described(str, 'e.g. "3 of 7 done"') });

const founderProfileFields = {
  id: uuid,
  user_id: uuid,
  journey_type: oneOf(JOURNEY_TYPES),
  business_status: oneOf(BUSINESS_STATUSES),
  business_name: nullable(str),
  description: str,
  sector: str,
  county: str,
  funding_amount_kes: nullable(int),
  use_of_funds: nullable(str),
  year_started: nullable(int),
  website: nullable(url),
  social_links: arr(url),
  stage: nullable(str),
  instruments: arr(str),
  months_trading: described(nullable(int), "Dormant: the small-business path is switched off."),
  monthly_revenue_band: described(nullable(str), "Dormant: the small-business path is switched off."),
  has_employees: nullable(bool),
  handles_personal_data: nullable(bool),
  women_owned: nullable(bool),
  youth_owned: nullable(bool),
  pwd_owned: nullable(bool),
  created_at: dateTime,
  updated_at: dateTime,
};

const funderPublicFields = {
  id: uuid,
  name: str,
  kind: oneOf(FUNDER_KINDS),
  mandate_text: str,
  journey_types: arr(oneOf(JOURNEY_TYPES)),
  sectors: described(arr(str), "Empty means all sectors."),
  stages: described(arr(str), "Empty means all stages."),
  counties: described(arr(str), "Empty means nationwide."),
  instruments: arr(str),
  ticket_min_kes: int,
  ticket_max_kes: int,
  requirements: described(arr(str), "Compliance item ids."),
  eligibility: arr(str),
  application_fee_kes: int,
  deadline: nullable(dateTime),
  how_to_apply_url: nullable(url),
  source_url: nullable(url),
  last_verified_at: nullable(dateTime),
  is_demo: described(bool, "True for a made-up record loaded from the demo data."),
};

const complianceItemPublic = {
  id: described(str, 'A readable id such as "kra_pin", not a UUID.'),
  title: str,
  why: nullable(str),
  institution: nullable(str),
  documents_needed: nullable(str),
  when_to_get_help: nullable(str),
  jurisdiction_level: str,
  recurrence: nullable(str),
  source_url: nullable(url),
  last_verified_at: nullable(dateTime),
  needs_review: described(bool, "Its review date has passed and nobody has re-checked it."),
  is_demo: bool,
};

const reason = obj({ signal: str, fits: bool, text: str });

const vettingApplicationFields = {
  id: uuid,
  user_id: uuid,
  phone: nullable(str),
  organisation_name: nullable(str),
  organisation_website: nullable(url),
  statement: nullable(str),
  references: nullable(str),
  claims_funder_id: nullable(uuid),
  risk_level: described(nullable(oneOf(["low", "medium", "high"])), "Set on submit. It only sorts the admin queue: every decision is made by a person."),
  risk_signals: arr(str),
  submitted_at: nullable(dateTime),
  decided_at: nullable(dateTime),
  decided_by: nullable(uuid),
  decision_reason: nullable(str),
  first_approved_by: nullable(uuid),
  recheck_due_at: nullable(dateTime),
  recheck_reason: nullable(str),
  created_at: dateTime,
  updated_at: dateTime,
};

const circleGoalView = obj({
  id: uuid,
  title: str,
  target_amount_kes: nullable(int),
  target_date: nullable(dateTime),
  status: oneOf(["open", "reached", "dropped"]),
  raised_kes: int,
  progress_text: nullable(str),
});

export const components: Record<string, Schema> = {
  Error: obj(
    {
      error: obj(
        {
          code: described(str, "Stable, machine-readable. Branch on this, not on the message."),
          message: described(str, "For a person to read."),
          fields: described(arr(obj({ path: str, message: str })), "Only with `VALIDATION_ERROR`: one entry per invalid field."),
        },
        ["fields"],
      ),
    },
  ),

  User: obj({ id: uuid, email: { type: "string", format: "email" }, full_name: str, role: ROLE, approval_status: APPROVAL_STATUS }),

  Session: obj({
    token: described(str, "JWT. Send it as `Authorization: Bearer <token>`. Valid for 7 days."),
    expires_at: described(int, "When the token stops working, in milliseconds since 1970."),
    user: ref("User"),
  }),

  CodeDelivery: obj(
    {
      email: described(SEND_STATUS, "Whether the email went out. `not_configured` when no `RESEND_API_KEY` is set."),
      expires_in_minutes: int,
      dev_code: DEV_CODE,
    },
    ["dev_code"],
  ),

  Settings: obj({
    full_name: str,
    phone: described(nullable(str), "Stored as `+254` followed by nine digits."),
    phone_verified_at: nullable(dateTime),
    preferred_language: oneOf(["en", "sw"]),
    notification_channel: oneOf(["in_app", "sms"]),
    message_permission: oneOf(["anyone", "verified", "none"]),
    share_contact: bool,
  }),

  Consent: obj({
    purpose: oneOf(CONSENT_PURPOSES),
    granted: described(bool, "False for a purpose she has never answered. Nothing is agreed by default."),
    granted_at: nullable(dateTime),
    withdrawn_at: nullable(dateTime),
  }),

  FounderProfile: obj(founderProfileFields),

  FounderProfileWithProgress: obj({
    ...founderProfileFields,
    already_have: described(arr(str), "Ids of the compliance items she has marked complete."),
    profile_completeness: described(int, "A whole percentage, 0 to 100."),
  }),

  InvestorProfile: obj({
    id: uuid,
    user_id: uuid,
    organisation_name: str,
    job_title: nullable(str),
    organisation_website: nullable(url),
    bio: nullable(str),
    created_at: dateTime,
    updated_at: dateTime,
  }),

  ExpertProfile: obj({
    id: uuid,
    user_id: uuid,
    profession: oneOf(PROFESSIONS),
    organisation_name: nullable(str),
    register_body: nullable(str),
    register_number: nullable(str),
    bio: str,
    sectors: arr(str),
    counties: arr(str),
    services: arr(str),
    office_hours_per_month: int,
    created_at: dateTime,
    updated_at: dateTime,
  }),

  Funder: obj(funderPublicFields),

  FunderRecord: described(
    obj({
      ...funderPublicFields,
      serves_groups: bool,
      verified_by: described(nullable(str), '"funder" when an investor maintains the record herself.'),
      claimed_by_user_id: nullable(uuid),
      created_at: dateTime,
    }),
    "The whole funder row, as the investor who maintains it and admins see it.",
  ),

  ChecklistItem: obj({ ...complianceItemPublic, status: COMPLIANCE_STATUS, note: nullable(str) }),

  ItemStatus: obj({ item_id: str, status: COMPLIANCE_STATUS, note: nullable(str) }),

  MatchCard: obj({
    funder: described(ref("Funder"), "When `anonymised` is true, `name`, `mandate_text`, `how_to_apply_url` and `source_url` are null."),
    anonymised: described(bool, "True for a record an investor maintains, while the founder is not approved. Show `headline` in place of the name."),
    headline: described(str, 'What the funder funds, with nothing that identifies it, e.g. "Angel investor · health, fintech · KSh 500,000 to KSh 5,000,000".'),
    source: described(oneOf(["public_information", "maintained_by_funder"]), "`maintained_by_funder` when an approved investor keeps the record."),
    investor: described(
      nullable(obj({ user_id: uuid, full_name: str, organisation_name: nullable(str), job_title: nullable(str) })),
      "The person behind a maintained record. Only for an approved founder, and only if the investor agreed to be visible.",
    ),
    investor_locked: described(bool, "There is an investor behind this record, hidden because the founder is not approved yet."),
    band: described(nullable(oneOf(["strong", "good", "possible", "not_a_fit"])), "How well the funder fits. Null in `not_for_you`."),
    explanation: str,
    reasons: arr(reason),
    gaps: arr(
      obj({
        kind: described(oneOf(["requirement", "unanswered"]), "`requirement` points at a compliance item, `unanswered` at a profile field."),
        ref: str,
        title: str,
        source_url: nullable(url),
        last_verified_at: nullable(dateTime),
      }),
    ),
    risk_factors: described(
      arr(obj({ code: oneOf(["application_fee", "deadline_passed", "demo_data", "not_verified"]), text: str })),
      "Things to check before applying. They never change the group.",
    ),
  }),

  TrackRecordEntry: obj({
    id: uuid,
    company_name: described(nullable(str), "Named only if the company agreed or the deal is already public."),
    sector: str,
    stage: nullable(str),
    year: nullable(int),
    instrument: nullable(str),
    amount_range: nullable(str),
    source: oneOf(["platform_deal", "public", "self_reported"]),
    source_label: described(str, '"Verified on FoundersLink", "Public source" or "Self-reported".'),
    source_url: nullable(url),
  }),

  PortfolioEntry: obj({
    id: uuid,
    investor_id: uuid,
    deal_id: nullable(uuid),
    company_name: str,
    sector: str,
    stage: nullable(str),
    year: nullable(int),
    instrument: nullable(str),
    amount_range: nullable(str),
    source: described(oneOf(["platform_deal", "public", "self_reported"]), "`public` when `source_url` is given, otherwise `self_reported`. `platform_deal` only comes from a deal closed here."),
    source_url: nullable(url),
    visibility: oneOf(["public", "hidden"]),
    company_consented: bool,
    created_at: dateTime,
  }),

  Venture: obj({
    id: uuid,
    founder_id: uuid,
    venture_name: str,
    sector: str,
    role: str,
    years: nullable(str),
    outcome: nullable(str),
    source: oneOf(["public", "self_reported"]),
    source_url: nullable(url),
    visibility: oneOf(["public", "hidden"]),
    created_at: dateTime,
  }),

  Contact: described(
    nullable(obj({ email: str, phone: described(nullable(str), "Only if verified."), whatsapp_link: nullable(url) })),
    "Null until the connection is accepted, and null if the member turned `share_contact` off.",
  ),

  Connection: obj({
    id: uuid,
    status: oneOf(["pending", "accepted", "declined", "withdrawn"]),
    message: nullable(str),
    direction: oneOf(["sent", "received"]),
    with: obj({
      id: uuid,
      full_name: str,
      role: ROLE,
      organisation_name: described(nullable(str), "For an investor."),
      focus_areas: described(arr(str), "For an investor: the sectors on her funder record."),
    }),
    pitch: nullable(str),
    vision: nullable(str),
    offer: nullable(str),
    proposed_amount_kes: nullable(int),
    decline_reason: nullable(str),
    contact: ref("Contact"),
    created_at: dateTime,
    responded_at: nullable(dateTime),
  }),

  DealMilestone: obj({ id: uuid, deal_id: uuid, title: str, due_date: nullable(dateTime), status: oneOf(["pending", "done"]) }),

  Deal: obj({
    id: uuid,
    type: oneOf(DEAL_TYPES),
    title: str,
    stage: oneOf(DEAL_STAGES),
    stage_label: str,
    status: oneOf(["open", "paused", "declined"]),
    next_stage: described(nullable(oneOf(DEAL_STAGES)), "Null when the deal is not open or is at the last stage."),
    pending: described(
      nullable(obj({ to_stage: oneOf(DEAL_STAGES), waiting_for: arr(obj({ user_id: uuid, full_name: str })) })),
      "A move every party must confirm, and who has still to do so.",
    ),
    terms: described(
      { type: "object", additionalProperties: true },
      "Whatever the parties saved with PATCH /deals/{id}/terms. Self-reported, not a legal document.",
    ),
    parties: arr(obj({ user_id: uuid, full_name: str, role: ROLE, shares_track_record: bool })),
    milestones: arr(ref("DealMilestone")),
    created_at: dateTime,
    closed_at: nullable(dateTime),
    notice: described(str, "A fixed sentence saying FoundersLink records the deal and does not move money."),
  }),

  Message: obj({
    id: described(uuid, "UUIDv7, so ids sort by creation time."),
    conversation_id: uuid,
    kind: described(oneOf(["user", "system"]), "`system` for a deal update posted in the deal's room."),
    sender: described(nullable(person), "Null for a system message."),
    body: str,
    warning: described(
      nullable(obj({ text: str, reasons: arr(str) })),
      "Set when the message looks like a request for money. Shown to everyone except its sender. The message is still delivered.",
    ),
    created_at: dateTime,
  }),

  Conversation: obj({
    id: uuid,
    type: oneOf(["direct", "deal", "circle"]),
    title: str,
    deal_id: nullable(uuid),
    circle_id: nullable(uuid),
    members: described(arr(personWithRole), "Everyone in it except the caller."),
    unread_count: int,
    last_message: nullable(ref("Message")),
    last_activity: dateTime,
  }),

  Circle: obj({
    id: uuid,
    name: str,
    description: nullable(str),
    type: oneOf(["money", "learning"]),
    sector: nullable(str),
    county: nullable(str),
    discoverable: bool,
    my_role: oneOf(["organiser", "treasurer", "member"]),
    registration_status: oneOf(["unregistered", "in_progress", "registered"]),
    registration_number: nullable(str),
    paybill_number: nullable(str),
    contribution: nullable(obj({ amount_kes: int, frequency: oneOf(["weekly", "monthly"]) })),
    total_contributed_kes: described(int, "Only payments matched to a member count."),
    members: arr(
      obj({
        user_id: uuid,
        full_name: str,
        role: oneOf(["organiser", "treasurer", "member"]),
        contributed_kes: int,
        this_period: described(nullable(obj({ paid_kes: int, due_kes: int })), "Null unless the circle has a set contribution."),
      }),
    ),
    goals: arr(circleGoalView),
    notice: described(nullable(str), "For a money circle: a fixed sentence saying FoundersLink keeps records and does not hold or move money."),
  }),

  CircleGoal: obj({
    id: uuid,
    circle_id: uuid,
    title: str,
    target_amount_kes: nullable(int),
    target_date: nullable(dateTime),
    status: oneOf(["open", "reached", "dropped"]),
    created_at: dateTime,
  }),

  PaymentRecord: obj({
    id: uuid,
    circle_id: uuid,
    member_id: nullable(uuid),
    goal_id: nullable(uuid),
    amount_kes: int,
    paid_at: dateTime,
    mpesa_receipt: nullable(str),
    source: oneOf(["manual", "statement", "paybill_callback"]),
    matched_status: oneOf(["matched", "unmatched", "ignored"]),
    payer_label: nullable(str),
    note: nullable(str),
    recorded_by: uuid,
    recorded_at: dateTime,
  }),

  CircleDecision: obj({
    id: uuid,
    question: str,
    status: oneOf(["open", "closed"]),
    votes: obj({ yes: int, no: int, abstain: int, not_voted: int }),
    my_vote: nullable(oneOf(["yes", "no", "abstain"])),
    created_at: dateTime,
    closed_at: nullable(dateTime),
  }),

  ExpertCard: obj({
    user_id: uuid,
    full_name: str,
    profession: oneOf(PROFESSIONS),
    organisation_name: nullable(str),
    register_body: nullable(str),
    register_checked: described(bool, "An admin recorded a passed `professional_register` check."),
    bio: str,
    sectors: described(arr(str), "Empty means all."),
    counties: described(arr(str), "Empty means all."),
    services: arr(str),
    office_hours: obj({ per_month: int, left_this_month: int }),
    helped: described(int, "Different people she has finished a session with."),
  }),

  Notification: obj({
    id: uuid,
    user_id: uuid,
    type: described(str, 'e.g. "connection_request", "deal_stage_changed", "vetting_approve", "deadline_reminder".'),
    title: str,
    body: str,
    link: described(nullable(str), "A path into the app."),
    delivery_status: described(str, '"in_app", or "sms_sent" / "sms_not_configured" / "sms_failed" when an SMS was attempted.'),
    read_at: nullable(dateTime),
    created_at: dateTime,
  }),

  VettingCheck: obj({
    id: uuid,
    application_id: uuid,
    check_type: oneOf(CHECK_TYPES),
    result: oneOf(["pass", "fail"]),
    method: oneOf(CHECK_METHODS),
    checked_by: uuid,
    checked_at: dateTime,
  }),

  VettingApplication: obj(vettingApplicationFields),

  VettingDocument: obj({
    id: uuid,
    type: oneOf(DOCUMENT_TYPES),
    label: nullable(str),
    file_name: str,
    mime_type: oneOf(["application/pdf", "image/jpeg", "image/png"]),
    size_bytes: int,
    status: oneOf(["uploaded", "verified", "rejected"]),
    rejection_reason: nullable(str),
    uploaded_at: dateTime,
    reviewed_at: nullable(dateTime),
    deleted_at: described(nullable(dateTime), "Set once the file itself has been deleted, 30 days after the decision. The record stays."),
  }),
};

export const applicant = obj({ id: uuid, full_name: str, email: str, role: ROLE, approval_status: APPROVAL_STATUS });

export const vettingApplicationWith = (extra: Record<string, Schema>) => obj({ ...vettingApplicationFields, ...extra });

export const page = (item: Schema) => obj({ items: arr(item), total: int, page: int, page_size: int, pages: int });

export const smsDelivery = obj(
  {
    sms: described(SEND_STATUS, "`not_configured` when no SMS provider is set, which is the case in every current deployment."),
    expires_in_minutes: int,
    dev_code: DEV_CODE,
  },
  ["dev_code"],
);
