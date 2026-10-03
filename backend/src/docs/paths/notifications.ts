import { arr, int, obj, oneOf, ref, uuid, type Op } from "../builder.js";

export const tag = {
  name: "Notifications",
  description:
    "A member's own notifications. No approval needed: the decision on her vetting application is itself a notification.\n\nEvery notification is stored. An SMS is attempted only when she chose `sms`, her number is verified and she agreed to `contact`; no SMS provider is configured, so in practice `delivery_status` is then `sms_not_configured`. New ones are also pushed over the WebSocket at `/ws`, which only an approved member can open.",
};

export const ops: Op[] = [
  {
    method: "get",
    path: "/notifications",
    summary: "My notifications",
    description: "The 50 most recent, newest first. There is no paging. `unread_count` counts every unread notification, not only those returned.",
    access: "user",
    // Read straight from req.query, not through a Zod schema, so written by hand.
    query: [
      {
        name: "unread",
        in: "query",
        required: false,
        description: "`true` returns only unread notifications. Any other value is ignored.",
        schema: oneOf(["true"]),
      },
    ],
    ok: { description: "The notifications.", schema: obj({ unread_count: int, notifications: arr(ref("Notification")) }) },
  },
  {
    method: "post",
    path: "/notifications/read-all",
    summary: "Mark all read",
    access: "user",
    ok: { description: "How many were marked.", schema: obj({ marked: int }) },
  },
  {
    method: "post",
    path: "/notifications/:id/read",
    summary: "Mark one read",
    access: "user",
    ok: { description: "Marked.", schema: obj({ id: uuid, read: { type: "boolean", const: true } }) },
    errors: [[404, "NOT_FOUND", "No such notification, or it belongs to someone else."]],
  },
  {
    method: "post",
    path: "/admin/jobs/deadline-reminders",
    summary: "Send deadline reminders now",
    description: "Reminds founders of compliance deadlines due in the next three days. Each deadline is reminded once. The same job runs hourly while the server is up.",
    access: "admin",
    ok: { description: "How many reminders were sent.", schema: obj({ reminded: int }) },
  },
];
