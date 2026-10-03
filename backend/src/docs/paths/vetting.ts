import { reviewSchema, uploadSchema } from "../../modules/vetting/documents.js";
import { applicationSchema, decisionSchema, reasonSchema, recheckSchema } from "../../modules/vetting/vetting.service.js";
import { arr, dateTime, described, fromZod, int, nullable, obj, oneOf, ref, str, url, uuid, type ErrorCase, type Op } from "../builder.js";
import { APPROVAL_STATUS, applicant, person, ROLE, vettingApplicationWith } from "../schemas.js";

export const tag = {
  name: "Vetting",
  description:
    "The application every member submits before she can see other members, and the admin's side of it. Every decision is made by a person, with a written reason; the risk level only sorts the queue.\n\nUploaded files are stored on the server's local disk under `UPLOAD_DIR` and are **not encrypted**. Each file is deleted 30 days after the decision on its application.",
};

const LOCKED: ErrorCase = [409, "APPLICATION_LOCKED", "The application has been submitted. It can be changed only in `draft` or `needs_info`."];
const NO_APPLICATION: ErrorCase = [404, "NOT_FOUND", "No such application."];
const NO_DOCUMENT: ErrorCase = [404, "NOT_FOUND", "No such document."];

const upload = fromZod(uploadSchema) as { properties: Record<string, unknown>; required: string[] };

export const ops: Op[] = [
  {
    method: "get",
    path: "/vetting/application",
    summary: "My application",
    description: "Her approval status, her application (null until she first saves it) and her documents.",
    access: "user",
    ok: {
      description: "The application.",
      schema: obj({
        approval_status: APPROVAL_STATUS,
        application: nullable({ allOf: [ref("VettingApplication"), obj({ checks: arr(ref("VettingCheck")) })] }),
        documents: arr(ref("VettingDocument")),
        identity_check: described(str, "A fixed sentence: identity is reviewed by an admin by hand, and no ID number or document is stored."),
      }),
    },
  },
  {
    method: "patch",
    path: "/vetting/application",
    summary: "Fill in my application",
    description: "Creates the application or updates the fields sent. An investor may set `claims_funder_id` to ask to take over an existing funder record; it becomes hers on approval.",
    access: "user",
    body: applicationSchema,
    ok: { description: "The saved application.", schema: ref("VettingApplication") },
    errors: [
      [403, "FORBIDDEN", "`claims_funder_id` was sent by an account that is not an investor."],
      [404, "NOT_FOUND", "`claims_funder_id` is not a funder record."],
      LOCKED,
      [409, "ALREADY_HAS_FUNDER", "She already maintains a funder record."],
      [409, "FUNDER_CLAIMED", "Someone already maintains the record she asked for."],
    ],
  },
  {
    method: "post",
    path: "/vetting/application/submit",
    summary: "Submit my application",
    description:
      "Locks the application and sets `approval_status` to `submitted`. Needs a verified email, a phone number and a statement; an investor also needs `organisation_name`.\n\nThe application is given a risk level and signals, by the AI service or, when none is configured or the call fails, by the rule-based stand-in. The backend adds one signal itself: the same phone number on another application. The risk level only orders the admin queue.",
    access: "user",
    ok: {
      description: "Submitted.",
      schema: obj({ approval_status: oneOf(["submitted"]), application: ref("VettingApplication") }),
    },
    errors: [
      [400, "APPLICATION_INCOMPLETE", "The phone number or statement is missing, or an investor has not named her organisation."],
      LOCKED,
      [409, "EMAIL_NOT_VERIFIED", "The email address is not verified."],
    ],
  },
  {
    method: "post",
    path: "/vetting/application/documents",
    summary: "Upload a document",
    description:
      "One file per request, as `multipart/form-data`. PDF, JPEG or PNG, up to 5 MB; the claimed type is checked against the file's first bytes. At most 10 documents per application, and only before it is submitted.\n\nThe file is written to the server's local disk under a name the backend chooses. It is **not encrypted** and there is no virus scan. Only admins can download it. ID documents are not asked for.",
    access: "user",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: { file: { type: "string", format: "binary" }, ...upload.properties },
            required: ["file", ...upload.required],
          },
        },
      },
    },
    ok: { status: 201, description: "The stored document.", schema: ref("VettingDocument") },
    errors: [
      [400, "VALIDATION_ERROR", "`type` is missing or not one of the document types."],
      [400, "NO_FILE", "No `file` part."],
      [400, "UNSUPPORTED_FILE", "Not a PDF, JPEG or PNG, or the content does not match the claimed type."],
      [400, "FILE_TOO_LARGE", "The file is larger than 5 MB."],
      [400, "UPLOAD_ERROR", "Another upload problem, e.g. more than one file or an unexpected field name."],
      LOCKED,
      [409, "TOO_MANY_DOCUMENTS", "The application already has 10 documents."],
    ],
  },
  {
    method: "delete",
    path: "/vetting/application/documents/:id",
    summary: "Remove a document",
    description: "Deletes the file and its record. Only her own, and only before she submits.",
    access: "user",
    ok: { description: "Removed.", schema: obj({ id: uuid, removed: { type: "boolean", const: true } }) },
    errors: [NO_DOCUMENT, LOCKED],
  },
  {
    method: "get",
    path: "/admin/vetting/queue",
    summary: "Applications waiting for a decision",
    description: "Those `submitted` or `in_review`: highest risk first, then the longest wait.",
    access: "admin",
    ok: { description: "The queue.", schema: arr(vettingApplicationWith({ user: applicant })) },
  },
  {
    method: "get",
    path: "/admin/vetting/rechecks",
    summary: "Approved members due a re-check",
    description: "A year has passed since approval, or she changed something her approval rested on (the organisation she invests for, or her profession or registration).",
    access: "admin",
    ok: {
      description: "Those due, the longest overdue first.",
      schema: arr(obj({ application_id: uuid, user: applicant, due_at: nullable(dateTime), reason: str, approved_at: nullable(dateTime) })),
    },
  },
  {
    method: "post",
    path: "/admin/vetting/:id/recheck",
    summary: "Record a re-check",
    description: "`confirm` keeps her approved and sets the next re-check a year on. `suspend` suspends her. Both are written to the audit log.",
    access: "admin",
    params: { id: described(uuid, "The application id.") },
    body: recheckSchema,
    ok: { description: "The outcome.", schema: obj({ application_id: uuid, approval_status: oneOf(["approved", "suspended"]) }) },
    errors: [[404, "NOT_FOUND", "No such application, its member is not approved, or no re-check is due."]],
  },
  {
    method: "get",
    path: "/admin/vetting/:id",
    summary: "One application, for review",
    description:
      "The application with its checks, documents, the person's profiles and the funder record she asked to take over. **This GET changes state:** opening an application that is `submitted` moves its member to `in_review`.",
    access: "admin",
    params: { id: described(uuid, "The application id.") },
    ok: {
      description: "The application.",
      schema: vettingApplicationWith({
        checks: arr(ref("VettingCheck")),
        user: obj({
          id: uuid,
          full_name: str,
          email: str,
          role: ROLE,
          approval_status: APPROVAL_STATUS,
          founder_profile: nullable(ref("FounderProfile")),
          investor_profile: nullable(ref("InvestorProfile")),
          expert_profile: nullable(ref("ExpertProfile")),
          funder: nullable(ref("FunderRecord")),
        }),
        claims_funder: nullable(obj({ id: uuid, name: str, source_url: nullable(url), claimed_by_user_id: nullable(uuid) })),
        documents: arr(ref("VettingDocument")),
      }),
    },
    errors: [NO_APPLICATION],
  },
  {
    method: "post",
    path: "/admin/vetting/:id/decision",
    summary: "Decide an application",
    description:
      "Approves, rejects or asks for more, with a written reason and any checks carried out. The applicant is notified in the app and by email (email delivery has the limits described under Auth).\n\nWith `INVESTOR_APPROVALS_REQUIRED=2`, the first approval of an investor answers `approval_status: \"in_review\"` with `approvals: { given: 1, needed: 2 }`, and a different admin must give the second.\n\nApproving an investor who asked to take over a funder record hands it to her, if nobody took it in the meantime. A final decision starts the 30 days after which the application's files are deleted.",
    access: "admin",
    params: { id: described(uuid, "The application id.") },
    body: decisionSchema,
    ok: {
      description: "The member's status after the decision.",
      schema: obj(
        {
          application_id: uuid,
          approval_status: oneOf(["approved", "rejected", "needs_info", "in_review"]),
          approvals: described(obj({ given: int, needed: int }), "Only after the first of two required approvals."),
        },
        ["approvals"],
      ),
    },
    errors: [
      NO_APPLICATION,
      [409, "NOT_AWAITING_DECISION", "The member is not `submitted` or `in_review`."],
      [409, "SAME_ADMIN", "Two approvals are required and this admin gave the first."],
    ],
  },
  {
    method: "post",
    path: "/admin/users/:id/suspend",
    summary: "Suspend a member",
    description: "Only an approved member. Takes effect on her next request, and her live connection is closed at once.",
    access: "admin",
    body: reasonSchema,
    ok: { description: "Suspended.", schema: obj({ user_id: uuid, approval_status: oneOf(["suspended"]) }) },
    errors: [
      [404, "NOT_FOUND", "No such user."],
      [409, "WRONG_STATUS", "The member is not approved."],
    ],
  },
  {
    method: "post",
    path: "/admin/users/:id/reinstate",
    summary: "Reinstate a suspended member",
    access: "admin",
    body: reasonSchema,
    ok: { description: "Approved again.", schema: obj({ user_id: uuid, approval_status: oneOf(["approved"]) }) },
    errors: [
      [404, "NOT_FOUND", "No such user."],
      [409, "WRONG_STATUS", "The member is not suspended."],
    ],
  },
  {
    method: "get",
    path: "/admin/actions",
    summary: "The audit log",
    description: "The 50 most recent admin actions, newest first. There is no paging.",
    access: "admin",
    ok: {
      description: "Admin actions.",
      schema: arr(
        obj({
          id: uuid,
          admin_id: uuid,
          action: described(str, 'e.g. "approve", "approve_first", "reject", "needs_info", "suspend", "reinstate", "recheck_confirmed", "create_admin".'),
          target_user_id: uuid,
          reason: str,
          created_at: dateTime,
          admin: person,
          target: obj({ id: uuid, full_name: str, role: ROLE }),
        }),
      ),
    },
  },
  {
    method: "get",
    path: "/admin/vetting/documents/:id/file",
    summary: "Download an uploaded file",
    description: "Sent as a download (`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`), read from the server's local disk. The file is stored unencrypted.",
    access: "admin",
    ok: {
      description: "The file.",
      content: Object.fromEntries(
        ["application/pdf", "image/jpeg", "image/png"].map((type) => [type, { schema: { type: "string", format: "binary" } }]),
      ),
    },
    errors: [NO_DOCUMENT, [410, "FILE_DELETED", "The file was deleted after the retention period. Its record remains."]],
  },
  {
    method: "patch",
    path: "/admin/vetting/documents/:id",
    summary: "Review a document",
    description: "Marks a document `verified` or `rejected`. `reason` is required when rejecting; that rule is checked in code and is not in the schema below.",
    access: "admin",
    body: reviewSchema,
    ok: { description: "The reviewed document.", schema: ref("VettingDocument") },
    errors: [NO_DOCUMENT],
  },
  {
    method: "post",
    path: "/admin/jobs/purge-documents",
    summary: "Delete expired files now",
    description: "Deletes the files whose 30 days are up. The same job runs hourly. Safe to run at any time.",
    access: "admin",
    ok: { description: "How many files were deleted.", schema: obj({ deleted: int }) },
  },
];
