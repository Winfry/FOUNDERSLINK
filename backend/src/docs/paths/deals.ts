import {
  checklistSchema,
  createSchema,
  DEAL_TYPES,
  milestonePatchSchema,
  milestoneSchema,
  partySchema,
  sharingSchema,
  stageSchema,
  statusSchema,
  termsSchema,
} from "../../modules/deals/deals.service.js";
import { DEAL_DOCUMENT_TYPES, dealUploadSchema } from "../../modules/deals/due-diligence.js";
import { reviewSchema } from "../../modules/vetting/documents.js";
import { requestSchema, respondSchema } from "../../modules/network/connections.js";
import { arr, bool, dateTime, described, fromZod, int, nullable, obj, oneOf, ref, str, url, uuid, type ErrorCase, type Op } from "../builder.js";
import { person, progress, ROLE } from "../schemas.js";

export const tag = {
  name: "Deals",
  description:
    "Connections between members, and deals: the record of a working relationship from first conversation to result. A deal records what its parties tell it. FoundersLink moves no money and drafts no legal document, and terms are self-reported.\n\nInside a deal the caller must be one of its parties; to anyone else it returns `404`.",
};

const NO_DEAL: ErrorCase = [404, "NOT_FOUND", "No such deal, or the caller is not one of its parties."];
const NOT_OPEN: ErrorCase = [409, "DEAL_NOT_OPEN", "The deal is paused or declined."];
const NOT_READY: ErrorCase = [
  409,
  "NOT_DEAL_READY",
  "The move is to `terms_agreed` and a party to an investment deal has not shared a required document. The message lists what is missing and from whom.",
];
const NO_DOCUMENT: ErrorCase = [404, "NOT_FOUND", "No such deal for the caller, or no such document on it."];
const FILE_DELETED: ErrorCase = [410, "FILE_DELETED", "The file was deleted after the retention period. Its record remains."];
const fileContent = Object.fromEntries(
  ["application/pdf", "image/jpeg", "image/png"].map((type) => [type, { schema: { type: "string", format: "binary" } }]),
);
const dealUpload = fromZod(dealUploadSchema) as { properties: Record<string, unknown>; required: string[] };

const precheck = described(
  nullable(
    obj({
      fields: described({ type: "object", additionalProperties: nullable(str) }, "What the AI service read, e.g. `business_name`, `registration_number`, `kra_pin`, `issued_on`."),
      checks: arr(obj({ check: str, passed: bool, note: nullable(str) }, ["note"])),
      concerns: arr(str),
      readable: bool,
    }),
  ),
  "Null when the AI service did not read the document: it was down, or the type is not one it reads. Never show \"AI pre-checked\" when this is null.",
);

const dealDocument = obj({
  id: uuid,
  user_id: described(uuid, "The party who shared it."),
  type: oneOf(DEAL_DOCUMENT_TYPES),
  title: str,
  label: nullable(str),
  file_name: str,
  mime_type: oneOf(["application/pdf", "image/jpeg", "image/png"]),
  size_bytes: int,
  status: oneOf(["uploaded", "verified", "rejected"]),
  check: described(oneOf(["uploaded", "ai_pre_checked", "confirmed", "rejected"]), "What to show. `ai_pre_checked` only when the AI service really read it; `confirmed` only once an admin has."),
  check_label: described(str, '"Uploaded", "AI pre-checked", "Confirmed by FoundersLink" or "Not accepted".'),
  precheck,
  rejection_reason: nullable(str),
  uploaded_at: dateTime,
  reviewed_at: nullable(dateTime),
  deleted_at: described(nullable(dateTime), "Set once the file itself has been deleted, 30 days after the deal closed or was declined."),
});

const dueDiligence = obj({
  deal_id: uuid,
  title: str,
  type: oneOf(DEAL_TYPES),
  stage: str,
  terms: described({ type: "object" }, "The terms as recorded so far: `amount_kes`, `instrument`, `equity_percent`, `roles`, `notes`, each optional."),
  deal_ready: described(bool, "Every party has shared what this deal asks of her, so it may move to `terms_agreed`."),
  parties: arr(
    obj({
      user_id: uuid,
      full_name: str,
      role: ROLE,
      ready: bool,
      required: arr(obj({ type: str, title: str, provided: bool })),
      documents: arr(dealDocument),
      verified: described(arr(str), "What FoundersLink has confirmed about her."),
      self_reported: described(arr(str), "What she says herself, including documents not yet confirmed."),
      missing: described(arr(str), "Required documents not shared yet, or rejected."),
    }),
  ),
  summary: str,
  engine: described(oneOf(["ai_service", "stand_in"]), "`ai_service` when the AI compiled the three lists and the summary, `stand_in` when the backend's rules did. Call it AI-compiled only for the first."),
  notice: str,
});

const dealId = { id: described(uuid, "The deal id.") };

export const ops: Op[] = [
  {
    method: "post",
    path: "/connections",
    summary: "Ask to connect",
    description:
      "Asks another approved member to connect. `pitch`, `vision`, `offer` and `proposed_amount_kes` are for an investor asking to join a founder. A withdrawn request can be sent again; a declined one cannot.",
    access: "approved",
    body: requestSchema,
    ok: {
      status: 201,
      description: "The request.",
      schema: obj({ id: uuid, status: oneOf(["pending"]), message: nullable(str), with: obj({ id: uuid, full_name: str, role: ROLE }) }),
    },
    errors: [
      [400, "INVALID_TARGET", "`user_id` is the caller."],
      [403, "NOT_ACCEPTING_REQUESTS", "The member set `message_permission` to `none`."],
      [403, "PHONE_VERIFICATION_REQUIRED", "The member accepts requests only from members with a verified phone number."],
      [404, "NOT_FOUND", "No such member, or she is not approved."],
      [409, "ALREADY_REQUESTED", "A connection between the two already exists (pending, accepted or declined)."],
    ],
  },
  {
    method: "get",
    path: "/connections",
    summary: "My connections",
    description: "Sent and received, newest first. An accepted connection carries `contact`, unless that member turned `share_contact` off.",
    access: "approved",
    ok: { description: "The connections.", schema: arr(ref("Connection")) },
  },
  {
    method: "patch",
    path: "/connections/:id",
    summary: "Accept or decline a request",
    description: "Only the person who was asked, and only once. `reason` is kept only when declining and is shown to the person who asked.",
    access: "approved",
    body: respondSchema,
    ok: { description: "The answer.", schema: obj({ id: uuid, status: oneOf(["accepted", "declined"]) }) },
    errors: [[404, "NOT_FOUND", "No pending request with this id addressed to the caller."]],
  },
  {
    method: "delete",
    path: "/connections/:id",
    summary: "Withdraw a request",
    description: "Only the person who asked, while it is unanswered. The connection is marked `withdrawn`, not removed.",
    access: "approved",
    ok: { description: "Withdrawn.", schema: obj({ id: uuid, status: oneOf(["withdrawn"]) }) },
    errors: [[404, "NOT_FOUND", "No pending request of the caller's with this id."]],
  },
  {
    method: "post",
    path: "/deals",
    summary: "Open a deal",
    description: "Between the caller and one other member she is connected with, or shares a circle with. Starts at `exploring`. A deal room is created in messaging.",
    access: "approved",
    body: createSchema,
    ok: { status: 201, description: "The deal.", schema: ref("Deal") },
    errors: [
      [400, "INVALID_TARGET", "`with_user_id` is the caller."],
      [404, "NOT_FOUND", "No such member, or she is not approved."],
      [409, "NOT_CONNECTED", "No accepted connection and no shared circle."],
    ],
  },
  {
    method: "get",
    path: "/deals",
    summary: "My deals",
    access: "approved",
    ok: { description: "Deals the caller is a party to, newest first.", schema: arr(ref("Deal")) },
  },
  {
    method: "get",
    path: "/deals/:id",
    summary: "One deal",
    access: "approved",
    params: dealId,
    ok: { description: "The deal.", schema: ref("Deal") },
    errors: [NO_DEAL],
  },
  {
    method: "post",
    path: "/deals/:id/parties",
    summary: "Add a party",
    description: "Brings in another approved member the caller is connected with or shares a circle with, e.g. a lawyer.",
    access: "approved",
    params: dealId,
    body: partySchema,
    ok: { description: "The deal.", schema: ref("Deal") },
    errors: [
      [404, "NOT_FOUND", "No such deal for the caller, or no such approved member."],
      NOT_OPEN,
      [409, "ALREADY_A_PARTY", "The member is already in the deal."],
      [409, "NOT_CONNECTED", "No accepted connection and no shared circle with the member."],
    ],
  },
  {
    method: "post",
    path: "/deals/:id/stage",
    summary: "Move to the next stage",
    description:
      "Stages run `exploring` → `due_diligence` → `terms_agreed` → `documents_compliance` → `closed` → `active`, one step at a time. Moving to `terms_agreed` or `closed` needs every party: this call proposes it and counts as the proposer's yes, and `pending.waiting_for` lists who has yet to confirm.\n\nClosing adds check-in milestones at 30, 90 and 180 days. Closing an `investment` deal also adds a hidden entry to each investor's track record.",
    access: "approved",
    params: dealId,
    body: stageSchema,
    ok: { description: "The deal.", schema: ref("Deal") },
    errors: [
      NO_DEAL,
      NOT_OPEN,
      [409, "WRONG_STAGE", "`to_stage` is not the stage after the current one."],
      [409, "ALREADY_PROPOSED", "A move is already waiting for the other parties."],
      NOT_READY,
    ],
  },
  {
    method: "post",
    path: "/deals/:id/stage/confirm",
    summary: "Confirm a proposed move",
    description: "The deal arrives at the stage once every party has confirmed.",
    access: "approved",
    params: dealId,
    ok: { description: "The deal.", schema: ref("Deal") },
    errors: [NO_DEAL, NOT_OPEN, [409, "NOTHING_TO_CONFIRM", "No stage change is waiting."], NOT_READY],
  },
  {
    method: "post",
    path: "/deals/:id/status",
    summary: "Pause, resume or decline",
    description: "Any party, with a reason. `declined` is final. Any move waiting for confirmation is dropped.",
    access: "approved",
    params: dealId,
    body: statusSchema,
    ok: { description: "The deal.", schema: ref("Deal") },
    errors: [
      NO_DEAL,
      [409, "DEAL_DECLINED", "The deal was declined and cannot be reopened."],
      [409, "NO_CHANGE", "The deal already has this status."],
    ],
  },
  {
    method: "patch",
    path: "/deals/:id/terms",
    summary: "Update the terms",
    description:
      "Merges the fields sent into the recorded terms. Unknown fields are rejected. Locked once the deal reaches `terms_agreed`. If a move was waiting for confirmation, the confirmations are withdrawn, since they were given for different terms.\n\nThe terms are what the parties say they agreed. Nothing here is checked, and no money moves.",
    access: "approved",
    params: dealId,
    body: termsSchema,
    ok: { description: "The deal.", schema: ref("Deal") },
    errors: [NO_DEAL, NOT_OPEN, [409, "TERMS_AGREED", "The deal is at `terms_agreed` or later."]],
  },
  {
    method: "get",
    path: "/deals/:id/timeline",
    summary: "The deal's timeline",
    description: "Every change, oldest first, with a ready-made sentence in `text`.",
    access: "approved",
    params: dealId,
    ok: {
      description: "The events.",
      schema: arr(
        obj({
          id: uuid,
          event: described(
            str,
            "`opened`, `party_added`, `stage_proposed`, `stage_confirmed`, `stage_changed`, `terms_updated`, `paused`, `declined`, `resumed`, `milestone_added` or `checklist_updated`.",
          ),
          text: str,
          actor: person,
          from_stage: nullable(str),
          to_stage: nullable(str),
          note: nullable(str),
          created_at: dateTime,
        }),
      ),
    },
    errors: [NO_DEAL],
  },
  {
    method: "post",
    path: "/deals/:id/milestones",
    summary: "Add a milestone",
    access: "approved",
    params: dealId,
    body: milestoneSchema,
    ok: { status: 201, description: "The milestone.", schema: ref("DealMilestone") },
    errors: [NO_DEAL],
  },
  {
    method: "patch",
    path: "/deals/:id/milestones/:mid",
    summary: "Edit a milestone",
    access: "approved",
    params: { ...dealId, mid: described(uuid, "The milestone id.") },
    body: milestonePatchSchema,
    ok: { description: "The milestone.", schema: ref("DealMilestone") },
    errors: [[404, "NOT_FOUND", "No such deal for the caller, or no such milestone in it."]],
  },
  {
    method: "patch",
    path: "/deals/:id/sharing",
    summary: "Share the closed deal on track records",
    description: "Each party says whether the closed deal may show on track records. It shows, and names the company, only when all of them agree.",
    access: "approved",
    params: dealId,
    body: sharingSchema,
    ok: { description: "Where things stand.", schema: obj({ deal_id: uuid, you_share: bool, shown_on_track_records: bool }) },
    errors: [NO_DEAL],
  },
  {
    method: "get",
    path: "/deals/:id/compliance",
    summary: "The deal's checklist",
    description: "The compliance items for this type of deal, with the status the parties have recorded. FoundersLink records and guides; it does not draft legal documents or give legal advice.",
    access: "approved",
    params: dealId,
    ok: {
      description: "The checklist.",
      schema: obj({
        deal_id: uuid,
        deal_type: oneOf(DEAL_TYPES),
        progress,
        items: arr(
          obj({
            id: str,
            title: str,
            why: nullable(str),
            when_to_get_help: nullable(str),
            source_url: nullable(url),
            last_verified_at: nullable(dateTime),
            is_demo: bool,
            status: oneOf(["not_started", "in_progress", "complete"]),
            note: nullable(str),
          }),
        ),
        disclaimer: str,
      }),
    },
    errors: [NO_DEAL],
  },
  {
    method: "patch",
    path: "/deals/:id/compliance/:item_id",
    summary: "Set the status of a checklist item",
    access: "approved",
    params: { ...dealId, item_id: described(str, "A compliance item id. Not a UUID.") },
    body: checklistSchema,
    ok: { description: "Saved.", schema: ref("ItemStatus") },
    errors: [[404, "NOT_FOUND", "No such deal for the caller, or the item is not on this deal type's checklist."]],
  },
  {
    method: "get",
    path: "/deals/:id/due-diligence",
    summary: "Due diligence: documents and the pack",
    description:
      "Level 3 (TEAM_DECISIONS D12). For each party: the documents this deal asks of her, the ones she has shared, and the pack's three lists (`verified`, `self_reported`, `missing`).\n\nAn `investment` deal asks a founder for `business_registration` and `kra_pin_certificate`, and an investor for `organisation_proof`. Other kinds of deal ask for nothing. A rejected document does not count.\n\nA document is **confirmed** only when an admin confirms it. The AI pre-check is a reading of the document, not proof it is genuine. Identity is not checked.",
    access: "approved",
    params: dealId,
    ok: { description: "The due-diligence view.", schema: dueDiligence },
    errors: [NO_DEAL],
  },
  {
    method: "post",
    path: "/deals/:id/documents",
    summary: "Share a document in a deal",
    description:
      "One file per request, as `multipart/form-data`. PDF, JPEG or PNG, up to 5 MB. Allowed from `due_diligence` until the deal closes, at most 10 per party.\n\nFor `business_registration` and `kra_pin_certificate` the backend asks the AI service to read the file and compare it with her profile, and stores the answer as `precheck`. If the AI service does not answer, the document is stored with `precheck: null`. Her `document_processing` consent is sent along: without it the AI service must not pass the file to an outside model.\n\nThe file is on the server's local disk, **not encrypted**, and is deleted 30 days after the deal closes or is declined. The other parties to the deal and admins can download it. ID documents are not asked for.",
    access: "approved",
    params: dealId,
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: { file: { type: "string", format: "binary" }, ...dealUpload.properties },
            required: ["file", ...dealUpload.required],
          },
        },
      },
    },
    ok: { status: 201, description: "The stored document.", schema: dealDocument },
    errors: [
      [400, "VALIDATION_ERROR", "`type` is missing or not one of the document types."],
      [400, "NO_FILE", "No `file` part."],
      [400, "UNSUPPORTED_FILE", "Not a PDF, JPEG or PNG, or the content does not match the claimed type."],
      [400, "FILE_TOO_LARGE", "The file is larger than 5 MB."],
      NO_DEAL,
      NOT_OPEN,
      [409, "WRONG_STAGE", "The deal has not reached due diligence, or has closed."],
      [409, "TOO_MANY_DOCUMENTS", "She has already shared 10 documents in this deal."],
    ],
  },
  {
    method: "delete",
    path: "/deals/:id/documents/:doc_id",
    summary: "Take back a document",
    description: "Her own, and only before an admin has reviewed it.",
    access: "approved",
    params: { ...dealId, doc_id: described(uuid, "The document id.") },
    ok: { description: "Removed.", schema: obj({ id: uuid, removed: { type: "boolean", const: true } }) },
    errors: [NO_DOCUMENT, [409, "ALREADY_REVIEWED", "An admin has confirmed or rejected it."]],
  },
  {
    method: "get",
    path: "/deals/:id/documents/:doc_id/file",
    summary: "Download a document shared in a deal",
    description: "Any party to the deal. Sent as a download.",
    access: "approved",
    params: { ...dealId, doc_id: described(uuid, "The document id.") },
    ok: { description: "The file.", content: fileContent },
    errors: [NO_DOCUMENT, FILE_DELETED],
  },
  {
    method: "get",
    path: "/admin/deal-documents",
    summary: "Deal documents waiting to be confirmed",
    description: "Oldest first, each with its deal, who shared it and the AI pre-check if there is one.",
    access: "admin",
    ok: {
      description: "The documents.",
      schema: arr({
        allOf: [
          dealDocument,
          obj({ deal: obj({ id: uuid, title: str, stage: str }), uploaded_by: obj({ id: uuid, full_name: str, role: ROLE }) }),
        ],
      }),
    },
  },
  {
    method: "get",
    path: "/admin/deal-documents/:id/file",
    summary: "Download a deal document",
    access: "admin",
    params: { id: described(uuid, "The document id.") },
    ok: { description: "The file.", content: fileContent },
    errors: [[404, "NOT_FOUND", "No such document."], FILE_DELETED],
  },
  {
    method: "patch",
    path: "/admin/deal-documents/:id",
    summary: "Confirm or reject a deal document",
    description: "`verified` makes it \"Confirmed by FoundersLink\". `rejected` needs a `reason`, which she is sent, and the document no longer counts towards being deal-ready.",
    access: "admin",
    params: { id: described(uuid, "The document id.") },
    body: reviewSchema,
    ok: { description: "The document.", schema: dealDocument },
    errors: [[404, "NOT_FOUND", "No such document."]],
  },
  {
    method: "get",
    path: "/admin/deals/:id/due-diligence",
    summary: "A deal's due-diligence view, for an admin",
    access: "admin",
    params: dealId,
    ok: { description: "The same view its parties see.", schema: dueDiligence },
    errors: [[404, "NOT_FOUND", "No such deal."]],
  },
];
