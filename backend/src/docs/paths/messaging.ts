import { openSchema, pageSchema, reportSchema, sendSchema } from "../../modules/messaging/messaging.service.js";
import { userReportSchema } from "../../modules/safety/reports.js";
import { arr, bool, dateTime, described, nullable, obj, oneOf, ref, str, uuid, type ErrorCase, type Op } from "../builder.js";
import { APPROVAL_STATUS, person, ROLE } from "../schemas.js";

export const tag = {
  name: "Messaging",
  description:
    "Direct chats between connected members, one room per deal and one group chat per circle, plus reporting and blocking. The caller must be in a conversation; to anyone else it returns `404`.\n\nMessages are stored on the server and are not end-to-end encrypted. Sending is always done here over REST. New messages are also pushed over the WebSocket at `/ws` (see the top of this document).",
};

const NO_CONVERSATION: ErrorCase = [404, "NOT_FOUND", "No such conversation, or the caller is not in it."];
const conversationId = { id: described(uuid, "The conversation id.") };
const reported = obj({ id: uuid, full_name: str, role: ROLE, approval_status: APPROVAL_STATUS });

export const ops: Op[] = [
  {
    method: "get",
    path: "/conversations",
    summary: "My conversations",
    description: "Most recent activity first. A deal's room has `type: \"deal\"`, a circle's group chat `type: \"circle\"`.",
    access: "approved",
    ok: { description: "The conversations.", schema: arr(ref("Conversation")) },
  },
  {
    method: "post",
    path: "/conversations",
    summary: "Open a direct chat",
    description: "Opens the chat with a member the caller has an accepted connection with, or returns the one they already have.",
    access: "approved",
    body: openSchema,
    ok: { status: 201, description: "A new chat was created.", schema: obj({ id: uuid, type: oneOf(["direct"]), created: bool }) },
    alsoOk: { 200: { description: "The chat already existed.", schema: obj({ id: uuid, type: oneOf(["direct"]), created: bool }) } },
    errors: [
      [400, "INVALID_TARGET", "`user_id` is the caller."],
      [409, "NOT_CONNECTED", "No accepted connection with this member."],
    ],
  },
  {
    method: "get",
    path: "/conversations/:id/messages",
    summary: "Messages in a conversation",
    description: "Newest first, a page at a time. Pass `next_before` as `before` for the older page.",
    access: "approved",
    params: conversationId,
    query: pageSchema,
    ok: {
      description: "A page of messages.",
      schema: obj({ messages: arr(ref("Message")), next_before: described(nullable(uuid), "Null when there is no older page.") }),
    },
    errors: [NO_CONVERSATION],
  },
  {
    method: "post",
    path: "/conversations/:id/messages",
    summary: "Send a message",
    description:
      "Stores the message and pushes it to members who are online.\n\nEvery message is checked for looking like a request for money: by the AI service if one is configured (the text is sent with emails and phone numbers removed, whatever the sender's consents), otherwise by the rule-based stand-in. A flagged message is still delivered; everyone except its sender sees `warning`.",
    access: "approved",
    params: conversationId,
    body: sendSchema,
    ok: { status: 201, description: "The message, as its sender sees it (`warning` is null).", schema: ref("Message") },
    errors: [[403, "BLOCKED", "A direct chat where either member has blocked the other. The answer does not say which."], NO_CONVERSATION],
  },
  {
    method: "post",
    path: "/conversations/:id/read",
    summary: "Mark a conversation read",
    access: "approved",
    params: conversationId,
    ok: { description: "Marked.", schema: obj({ conversation_id: uuid, unread_count: { type: "integer", const: 0 } }) },
    errors: [NO_CONVERSATION],
  },
  {
    method: "post",
    path: "/messages/:id/report",
    summary: "Report a message",
    description: "Reports from three different members, across message and member reports, suspend the sender until an admin has looked.",
    access: "approved",
    params: { id: described(uuid, "The message id.") },
    body: reportSchema,
    ok: { status: 201, description: "Reported.", schema: obj({ message_id: uuid, reported: bool, sender_suspended: bool }) },
    errors: [
      [400, "SYSTEM_MESSAGE", "System messages cannot be reported."],
      [400, "OWN_MESSAGE", "The message is the caller's own."],
      [404, "NOT_FOUND", "No such message, or the caller is not in its conversation."],
      [409, "ALREADY_REPORTED", "The caller has already reported this message."],
    ],
  },
  {
    method: "post",
    path: "/reports",
    summary: "Report a member",
    description: "Reports from three different members, across message and member reports, suspend the member until an admin has looked.",
    access: "approved",
    body: userReportSchema,
    ok: { status: 201, description: "Reported.", schema: obj({ user_id: uuid, reported: bool, suspended: bool }) },
    errors: [
      [400, "INVALID_TARGET", "`user_id` is the caller."],
      [404, "NOT_FOUND", "No such member, she is an admin, or she is neither approved nor suspended."],
      [409, "ALREADY_REPORTED", "The caller has already reported this member."],
    ],
  },
  {
    method: "put",
    path: "/users/:id/block",
    summary: "Block a member",
    description: "Stops direct messages in both directions. It does not affect deal rooms or circle chats.",
    access: "approved",
    params: { id: described(uuid, "The member's user id.") },
    ok: { description: "Blocked.", schema: obj({ user_id: uuid, blocked: bool }) },
    errors: [
      [400, "INVALID_TARGET", "`id` is the caller."],
      [404, "NOT_FOUND", "No such user."],
    ],
  },
  {
    method: "delete",
    path: "/users/:id/block",
    summary: "Unblock a member",
    description: "Succeeds whether or not a block existed.",
    access: "approved",
    params: { id: described(uuid, "The member's user id.") },
    ok: { description: "Not blocked.", schema: obj({ user_id: uuid, blocked: bool }) },
    errors: [[400, "INVALID_TARGET", "`id` is the caller."]],
  },
  {
    method: "get",
    path: "/admin/reports",
    summary: "Reported messages and members",
    description: "The 100 most recent of each, newest first. There is no paging.",
    access: "admin",
    ok: {
      description: "The reports.",
      schema: obj({
        messages: arr(
          obj({
            id: uuid,
            reason: str,
            reporter: person,
            message: obj({ id: uuid, body: str, flagged: bool, sent_at: dateTime }),
            sender: nullable(reported),
            created_at: dateTime,
          }),
        ),
        members: arr(obj({ id: uuid, reason: str, reporter: person, reported, created_at: dateTime })),
      }),
    },
  },
];
