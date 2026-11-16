import { filterSchema, findSchema, requestSchema, respondSchema } from "../../modules/experts/experts.service.js";
import { arr, dateTime, described, int, nullable, obj, oneOf, ref, str, uuid, type Op } from "../builder.js";
import { person } from "../schemas.js";

export const tag = {
  name: "Experts",
  description: "Vetted mentors, lawyers and accountants, and short office-hours sessions with them. Sessions are requested and tracked here; they are not scheduled, held or paid for through FoundersLink.",
};

const SESSION_STATUS = oneOf(["requested", "accepted", "declined", "done"]);

export const ops: Op[] = [
  {
    method: "get",
    path: "/experts",
    summary: "Find experts",
    description: "Approved experts who agreed to `profile_visibility`: those with a session left this month first, then those who have helped the most people. At most 50. An expert with no sectors or counties listed covers all of them.",
    access: "approved",
    query: filterSchema,
    ok: { description: "The experts.", schema: arr(ref("ExpertCard")) },
  },
  {
    method: "post",
    path: "/experts/find",
    summary: "Find experts from a question",
    description:
      "The caller describes what she needs in her own words, in English or Kiswahili (\"I want to invest in a farming business, who knows land law?\"). The question is read for a profession, practice area, sector and county; up to three approved, visible experts come back best first, each with the reasons it fits, plus a short plain explanation and a note that this is general information, not advice. Nothing is booked.",
    access: "approved",
    body: findSchema,
    ok: {
      description: "What was understood, why it matters, and the experts.",
      schema: obj({
        understood: obj({
          profession: nullable(str),
          practice_area: nullable(str),
          practice_area_label: nullable(str),
          sector: nullable(str),
          county: nullable(str),
          budget_kes: described(nullable(int), 'Her budget, when she gives one ("under KES 10,000"). Experts within it come first.'),
        }),
        explanation: str,
        experts: arr(ref("ExpertCard")),
        plan: described(
          nullable(
            arr(
              obj({
                need: str,
                area: described(str, "The practice area that need searches for."),
                who: described(str, '"An accountant or auditor".'),
                why: described(str, "Why, from the caller's side (founder or investor)."),
                step: described(str, '"Due diligence", "Terms agreed"...'),
                expert: described(nullable(ref("ExpertCard")), "The best verified expert for it, or null when none offers it yet."),
              }),
            ),
          ),
          'When the question asks for the whole path ("I\'m preparing to raise investment, who will I need?"): who often helps at each step, in order. Null otherwise.',
        ),
        note: str,
      }),
    },
  },
  {
    method: "post",
    path: "/experts/:id/office-hours",
    summary: "Ask for an office-hours session",
    description: "The expert is notified. Only one open session per expert at a time.",
    access: "approved",
    params: { id: described(uuid, "The expert's user id.") },
    body: requestSchema,
    ok: {
      status: 201,
      description: "The request.",
      schema: obj({
        id: uuid,
        expert_id: uuid,
        requester_id: uuid,
        topic: str,
        status: SESSION_STATUS,
        created_at: dateTime,
        responded_at: nullable(dateTime),
      }),
    },
    errors: [
      [400, "INVALID_TARGET", "`id` is the caller."],
      [404, "NOT_FOUND", "No such expert, or she is not approved or not visible."],
      [409, "NO_SLOTS", "The expert has no office hours left this month."],
      [409, "ALREADY_REQUESTED", "The caller already has a requested or accepted session with this expert."],
    ],
  },
  {
    method: "get",
    path: "/me/office-hours",
    summary: "My office-hours sessions",
    description: "Sessions the caller asked for, and sessions she was asked for as an expert. Newest first.",
    access: "approved",
    ok: {
      description: "The sessions.",
      schema: arr(
        obj({
          id: uuid,
          topic: str,
          status: SESSION_STATUS,
          role: described(oneOf(["expert", "requester"]), "The caller's side of the session."),
          with: person,
          created_at: dateTime,
          responded_at: nullable(dateTime),
        }),
      ),
    },
  },
  {
    method: "patch",
    path: "/office-hours/:id",
    summary: "Answer or finish a session",
    description: "The expert only. A `requested` session can be `accepted` or `declined`; an `accepted` one can be marked `done`. Accepting creates an accepted connection between the two, so they can message each other.",
    access: "approved",
    params: { id: described(uuid, "The session id.") },
    body: respondSchema,
    ok: { description: "The session's new status.", schema: obj({ id: uuid, status: SESSION_STATUS }) },
    errors: [
      [404, "NOT_FOUND", "No such session, or the caller is not its expert."],
      [409, "WRONG_STATUS", "The session cannot go from its current status to this one."],
      [409, "NO_SLOTS", "Accepting, and the expert has no office hours left this month."],
    ],
  },
];
