import { applicationsQuery, newAdminSchema, usersQuery } from "../../modules/admin/admin.service.js";
import { arr, bool, dateTime, described, int, nullable, obj, oneOf, ref, str, uuid, type Op } from "../builder.js";
import { APPROVAL_STATUS, applicant, page, ROLE } from "../schemas.js";

export const tag = {
  name: "Admin",
  description: "The admin dashboard: members, applications, numbers and admin accounts. Admins see members' contact details. Password hashes and two-step secrets are never returned.",
};

const counts = { type: "object", additionalProperties: { type: "integer" } };
const adminAccount = obj({ id: uuid, full_name: str, email: str, totp_enabled: bool, approval_status: APPROVAL_STATUS, created_at: dateTime });

export const ops: Op[] = [
  {
    method: "get",
    path: "/admin/stats",
    summary: "Dashboard numbers",
    description: "Counts of members, applications, reports, deals and circles, and sign-ups for each of the last six months (UTC), including months with none. Admin accounts are not counted as members.",
    access: "admin",
    ok: {
      description: "The numbers.",
      schema: obj({
        members: obj({ total: int, by_role: counts, by_status: counts }),
        applications_waiting: int,
        rechecks_due: int,
        reports: obj({ messages: int, members: int }),
        deals: obj({ total: int, by_stage: counts }),
        deals_with_documents_waiting: described(int, "Deals with at least one shared document still waiting for an admin (status `uploaded`, file not yet deleted): the deals behind `GET /admin/deal-documents`. Counts deals, not documents."),
        chamas: described(int, "Money circles only. The same number as `circles.chamas`."),
        circles: obj({
          total: described(int, "Money circles and learning circles together. Do not label this \"Chamas\"."),
          by_type: described(counts, "By `money` or `learning`. A type with none is left out."),
          chamas: described(int, "Money circles only."),
          learning_circles: int,
        }),
        registrations: arr(obj({ month: described(str, "YYYY-MM"), founders: int, investors: int, experts: int })),
      }),
    },
  },
  {
    method: "get",
    path: "/admin/users",
    summary: "List members",
    description: "Members a page at a time, newest first. `search` looks in the name and the email address. Admin accounts are not listed here; see GET /admin/admins.",
    access: "admin",
    query: usersQuery,
    ok: {
      description: "A page of members.",
      schema: page(
        obj({
          id: uuid,
          full_name: str,
          email: str,
          phone: nullable(str),
          role: ROLE,
          approval_status: APPROVAL_STATUS,
          created_at: dateTime,
          summary: described(nullable(str), "Her business name, organisation or profession, whichever her role has."),
          sector: nullable(str),
          county: nullable(str),
        }),
      ),
    },
  },
  {
    method: "get",
    path: "/admin/users/:id",
    summary: "One member in detail",
    description: "Her profiles, application, consents, how many reports there are against her, and her history in order.",
    access: "admin",
    ok: {
      description: "The member.",
      schema: obj({
        id: uuid,
        full_name: str,
        email: str,
        email_verified_at: nullable(dateTime),
        phone: nullable(str),
        phone_verified_at: nullable(dateTime),
        role: ROLE,
        approval_status: APPROVAL_STATUS,
        created_at: dateTime,
        founder_profile: nullable(ref("FounderProfile")),
        investor_profile: nullable(ref("InvestorProfile")),
        expert_profile: nullable(ref("ExpertProfile")),
        funder: nullable(ref("FunderRecord")),
        vetting_application: nullable({ allOf: [ref("VettingApplication"), obj({ checks: arr(ref("VettingCheck")) })] }),
        consents: arr(obj({ purpose: str, granted: bool })),
        reports_against: obj({ messages: int, member: int }),
        activity: obj({ deals: int, circles: int }),
        timeline: arr(
          obj({
            at: dateTime,
            event: described(str, '"joined", "applied", or an admin action such as "approve" or "suspend".'),
            text: str,
            by: described(nullable(str), "The admin's name, for an admin action."),
            reason: nullable(str),
          }),
        ),
      }),
    },
    errors: [[404, "NOT_FOUND", "No such member, or the id belongs to an admin."]],
  },
  {
    method: "get",
    path: "/admin/vetting/applications",
    summary: "List every submitted application",
    description: "Waiting and decided applications, most recently submitted first. The waiting ones sorted by risk are at GET /admin/vetting/queue.",
    access: "admin",
    query: applicationsQuery,
    ok: {
      description: "A page of applications.",
      schema: page(
        obj({
          id: uuid,
          user: applicant,
          status: APPROVAL_STATUS,
          risk_level: nullable(oneOf(["low", "medium", "high"])),
          risk_signals: arr(str),
          organisation_name: nullable(str),
          submitted_at: nullable(dateTime),
          decided_at: nullable(dateTime),
          decision_reason: nullable(str),
        }),
      ),
    },
  },
  {
    method: "get",
    path: "/admin/admins",
    summary: "List admin accounts",
    access: "admin",
    ok: { description: "Admins, oldest first.", schema: arr(adminAccount) },
  },
  {
    method: "post",
    path: "/admin/admins",
    summary: "Create an admin account",
    description: "The only way to become an admin from inside the app. Written to the audit log with who did it. The password must be at least 12 characters.",
    access: "admin",
    body: newAdminSchema,
    ok: { status: 201, description: "The new admin.", schema: adminAccount },
    errors: [[409, "EMAIL_TAKEN", "An account with this email already exists."]],
  },
];
