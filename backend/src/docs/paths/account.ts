import { codeSchema, deleteSchema, settingsSchema } from "../../modules/account/account.service.js";
import { consentSchema } from "../../modules/account/consents.js";
import { arr, dateTime, described, obj, ref, str, type Op, type Schema } from "../builder.js";
import { smsDelivery } from "../schemas.js";

export const tag = {
  name: "Account",
  description: "A person's own data and choices: consents, settings, phone number, export and deletion. None of it needs approval.",
};

const loose: Schema = { type: "object", additionalProperties: true };

export const ops: Op[] = [
  {
    method: "get",
    path: "/me/consents",
    summary: "List consents",
    description: "Every purpose, with whether and when she agreed. Nothing is agreed by default.",
    access: "user",
    ok: { description: "One entry per purpose.", schema: arr(ref("Consent")) },
  },
  {
    method: "post",
    path: "/me/consents",
    summary: "Grant or withdraw a consent",
    description:
      "What each purpose switches on:\n\n- `profile_visibility`: she appears in other members' matches and her profile page can be opened.\n- `ai_matching`: her business details may be sent to the AI service. Without it the backend's own rules answer, and responses say `engine: \"stand_in\"`.\n- `eligibility_attributes`: she may set `women_owned`, `youth_owned` or `pwd_owned`. Withdrawing it clears those fields from her profile.\n- `contact`: needed before a notification is sent by SMS. No SMS provider is configured, so nothing is sent either way.\n- `document_processing`: documents she uploads for a deal may be read by an AI model outside the AI service. Without it they are checked by a person only.",
    access: "user",
    body: consentSchema,
    ok: { description: "Every purpose, after the change.", schema: arr(ref("Consent")) },
  },
  {
    method: "get",
    path: "/me/export",
    summary: "Export my data",
    description:
      "Everything held about her, as a JSON download (`Content-Disposition: attachment`). Where she shares a record with someone else (a deal, a circle, a chat) the export has her own part of it, not the other person's details.",
    access: "user",
    ok: {
      description: "The export.",
      schema: described(
        obj({
          exported_at: dateTime,
          account: loose,
          consents: arr(ref("Consent")),
          compliance: obj({ statuses: arr(loose), deadlines: arr(loose), questions: arr(loose) }),
          connections: arr(loose),
          deals: arr(loose),
          circles: obj({ memberships: arr(loose), contributions: arr(loose), notes: arr(loose), votes: arr(loose) }),
          messages_sent: arr(loose),
          reports_made: arr(loose),
          blocks: arr(loose),
          note: str,
        }),
        "Most values are database rows and are not listed field by field here.",
      ),
    },
  },
  {
    method: "delete",
    path: "/me",
    summary: "Delete my account",
    description:
      "Deletes the account, everything that belongs only to her, and her uploaded files. Cannot be undone, so the password is asked for again. Refused while she organises a circle that has other members, or has a deal in progress.",
    access: "user",
    body: deleteSchema,
    ok: { description: "Deleted.", schema: obj({ deleted: { type: "boolean", const: true } }) },
    errors: [
      [401, "UNAUTHORIZED", "Wrong password."],
      [409, "ADMIN_ACCOUNT", "An admin account cannot be deleted here."],
      [409, "ORGANISES_CIRCLES", "She organises a circle that still has other members."],
      [409, "DEALS_IN_PROGRESS", "She is a party to a deal that is open or paused and not yet closed."],
    ],
  },
  {
    method: "patch",
    path: "/me",
    summary: "Update settings",
    description:
      "Any of the fields. A Kenyan mobile number is accepted as `07...`, `01...`, `2547...` or `+2547...` and stored as `+254...`; send `null` to remove it. Changing the number clears its verification.",
    access: "user",
    body: settingsSchema,
    ok: { description: "The settings after the change.", schema: ref("Settings") },
    errors: [
      [409, "PHONE_TAKEN", "The phone number is on another account."],
      [409, "PHONE_NOT_VERIFIED", "`notification_channel` is (or would be) `sms` and the phone number is not verified."],
    ],
  },
  {
    method: "post",
    path: "/me/phone/code",
    summary: "Send a phone verification code",
    description:
      "Issues a six-digit code valid for 10 minutes. **No SMS provider is configured**, so the code is not texted: `sms` is `not_configured`, and outside production the response includes `dev_code` so the flow can still be shown. In production with no provider the code cannot reach her at all. The sender targets Africa's Talking and has not been run against its real sandbox.",
    access: "user",
    ok: { description: "Whether the SMS went out.", schema: smsDelivery },
    errors: [
      [409, "NO_PHONE", "No phone number on the account."],
      [409, "ALREADY_VERIFIED", "The phone number is already verified."],
    ],
  },
  {
    method: "post",
    path: "/me/phone/verify",
    summary: "Verify the phone number",
    access: "user",
    body: codeSchema,
    ok: { description: "The settings, with `phone_verified_at` set.", schema: ref("Settings") },
    errors: [
      [400, "WRONG_CODE", "The code is not right. Counts towards the five tries."],
      [400, "CODE_EXPIRED", "No code is pending, or it has expired."],
      [429, "TOO_MANY_ATTEMPTS", "Five wrong codes. Ask for a new one."],
    ],
  },
];
