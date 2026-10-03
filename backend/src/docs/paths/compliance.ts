import { askSchema, deadlineSchema, feedbackSchema, statusSchema } from "../../modules/compliance/compliance.service.js";
import { arr, bool, dateTime, described, int, nullable, obj, oneOf, ref, str, url, uuid, type Op } from "../builder.js";
import { ENGINE, progress } from "../schemas.js";

export const tag = {
  name: "Compliance",
  description: "A founder's compliance checklist, her deadlines and Ask Compliance. This is general information, never legal advice, and progress is a count, not a score.",
};

const itemId = { item_id: described(str, 'A compliance item id such as "kra_pin". Not a UUID.') };
const NO_ITEM: [number, string, string] = [404, "NOT_FOUND", "No business compliance item with this id."];
const NO_PROFILE: [number, string, string] = [409, "PROFILE_REQUIRED", "The founder has not saved her profile yet."];

export const ops: Op[] = [
  {
    method: "get",
    path: "/compliance",
    summary: "My compliance checklist",
    description:
      "The items that apply to her business, with her status on each. Which items apply is decided by the AI service when she has agreed to `ai_matching` and the service answers; otherwise by the backend's own rules, and `engine` is `stand_in`.\n\n`county.covered` is false when there are no county-level items for her county, so she is not left to assume another county's rules apply.",
    access: "founder",
    ok: {
      description: "The checklist.",
      schema: obj({
        engine: ENGINE,
        progress,
        county: obj({ name: str, covered: bool, message: nullable(str) }),
        items: arr(ref("ChecklistItem")),
        disclaimer: str,
      }),
    },
    errors: [NO_PROFILE],
  },
  {
    method: "get",
    path: "/compliance/deadlines",
    summary: "My deadlines",
    description: "The dates she has recorded herself, soonest first. No date is ever made up for her.",
    access: "founder",
    ok: {
      description: "Her deadlines.",
      schema: arr(
        obj({
          item_id: str,
          title: str,
          due_date: dateTime,
          recurrence: nullable(str),
          overdue: bool,
          source_url: nullable(url),
          last_verified_at: nullable(dateTime),
        }),
      ),
    },
  },
  {
    method: "post",
    path: "/compliance/ask",
    summary: "Ask a compliance question",
    description:
      "Answers from the stored compliance items, with citations, or says it cannot confirm. Every question and answer is stored.\n\nThe AI service answers when one is configured and responds; her business details go with the question only if she has agreed to `ai_matching`. Otherwise the rule-based stand-in answers, only by pointing at a stored item that has an official source, and `engine` is `stand_in`. Items whose review date has passed are not quoted.\n\nWhen `suggest_expert` is true, up to three experts are suggested. They are named only to an approved member; anyone else gets an empty `experts` and the number in `experts_available`.",
    access: "user",
    body: askSchema,
    ok: {
      description: "The answer.",
      schema: obj({
        id: described(uuid, "The stored question, for POST /compliance/questions/{id}/feedback."),
        answer: str,
        citations: arr(obj({ source: str, url: str, last_verified: nullable(str) })),
        confident: described(bool, "False when the answer is \"cannot confirm\"."),
        suggest_expert: bool,
        engine: ENGINE,
        experts: arr(ref("ExpertCard")),
        experts_available: int,
        disclaimer: str,
      }),
    },
  },
  {
    method: "post",
    path: "/compliance/questions/:id/feedback",
    summary: "Rate an answer",
    access: "user",
    body: feedbackSchema,
    ok: { description: "Saved.", schema: obj({ id: uuid, feedback: oneOf(["helpful", "not_helpful"]) }) },
    errors: [[404, "NOT_FOUND", "No such question, or it was asked by someone else."]],
  },
  {
    method: "get",
    path: "/compliance/:item_id",
    summary: "One compliance item",
    description: "The item with her status, note and the due date she recorded, if any.",
    access: "founder",
    params: itemId,
    ok: {
      description: "The item.",
      schema: { allOf: [ref("ChecklistItem"), obj({ due_date: nullable(dateTime), disclaimer: str })] },
    },
    errors: [NO_ITEM],
  },
  {
    method: "patch",
    path: "/compliance/:item_id/status",
    summary: "Set my status on an item",
    description: "An item marked `complete` counts as something she already has, so it closes the matching gap in GET /funding/matches.",
    access: "founder",
    params: itemId,
    body: statusSchema,
    ok: { description: "Saved.", schema: ref("ItemStatus") },
    errors: [NO_ITEM, NO_PROFILE],
  },
  {
    method: "put",
    path: "/compliance/:item_id/deadline",
    summary: "Set my deadline for an item",
    description: "Records when something of hers is due, e.g. a permit renewal. Leave `recurrence` out to take the item's own; send `null` for none. A new date means a new reminder is owed.",
    access: "founder",
    params: itemId,
    body: deadlineSchema,
    ok: {
      description: "The deadline.",
      schema: obj({
        id: uuid,
        entity_type: oneOf(["business"]),
        entity_id: described(uuid, "The founder's user id."),
        item_id: str,
        due_date: dateTime,
        recurrence: nullable(str),
        reminder_sent_at: nullable(dateTime),
        created_by: uuid,
      }),
    },
    errors: [NO_ITEM, NO_PROFILE],
  },
  {
    method: "get",
    path: "/admin/compliance/sources",
    summary: "How fresh each compliance item is",
    description: "Every item, business and deal scope, with flags for what needs attention. The most flagged come first.",
    access: "admin",
    ok: {
      description: "The report.",
      schema: obj({
        total: int,
        needing_attention: int,
        items: arr(
          obj({
            id: str,
            title: str,
            scope: oneOf(["business", "deal"]),
            institution: nullable(str),
            owner: nullable(str),
            source_url: nullable(url),
            last_verified_at: nullable(dateTime),
            next_review_at: nullable(dateTime),
            finance_act_year: nullable(int),
            is_demo: bool,
            flags: arr(oneOf(["no_source", "never_verified", "review_due", "no_owner"])),
          }),
        ),
      }),
    },
  },
];
