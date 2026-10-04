import { loginSchema, registerSchema } from "../../modules/auth/auth.service.js";
import { codeSchema, forgotSchema, resetSchema } from "../../modules/auth/email-codes.js";
import { enableSchema, verifySchema } from "../../modules/auth/two-factor.js";
import { bool, dateTime, described, int, nullable, obj, oneOf, ref, str, uuid, type Op } from "../builder.js";
import { APPROVAL_STATUS, ROLE } from "../schemas.js";

export const tag = {
  name: "Auth",
  description: "Sign-up, sign-in, email codes, password reset, and two-step sign-in for admins.",
};

const WRONG_CODE = "The code is wrong, has expired, or has been tried five times. One message for all three.";
const NOT_ADMIN = "The account is not an admin. Two-step sign-in is for admin accounts only.";

export const ops: Op[] = [
  {
    method: "post",
    path: "/auth/register",
    summary: "Create an account",
    description:
      "Creates a founder or investor account and signs it in. `admin` and `expert` cannot be chosen here: experts are cut from sign-up for now, and `role: \"expert\"` is refused with `400 VALIDATION_ERROR`. The account starts with `approval_status: \"draft\"`.\n\nA six-digit code is emailed to prove the address. Email goes through Resend; until a sending domain is verified there, it reaches only the address that owns the Resend account. When the email cannot be sent, `email_verification.dev_code` carries the code outside production.",
    access: "public",
    body: registerSchema,
    ok: {
      status: 201,
      description: "The account and a session for it.",
      schema: { allOf: [ref("Session"), obj({ email_verification: ref("CodeDelivery") })] },
    },
    errors: [[409, "EMAIL_TAKEN", "An account with this email already exists."]],
  },
  {
    method: "post",
    path: "/auth/login",
    summary: "Sign in",
    description:
      "Returns a session. For an admin with two-step sign-in switched on it returns no session, only a `pending_token` (valid five minutes) to exchange at POST /auth/2fa/verify.",
    access: "public",
    body: loginSchema,
    ok: {
      description: "A session, or the first half of a two-step sign-in.",
      schema: {
        oneOf: [ref("Session"), obj({ two_factor_required: { type: "boolean", const: true }, pending_token: str })],
      },
    },
    errors: [[401, "UNAUTHORIZED", "Wrong email or password. The same answer for both, so it does not reveal which emails have accounts."]],
  },
  {
    method: "get",
    path: "/me",
    summary: "The signed-in user",
    description: "The account, its settings, and whichever profiles it has. `founder_profile` is null until onboarding is saved.",
    access: "user",
    ok: {
      description: "The account.",
      schema: obj({
        id: uuid,
        email: str,
        full_name: str,
        role: ROLE,
        approval_status: APPROVAL_STATUS,
        totp_enabled: bool,
        email_verified_at: nullable(dateTime),
        phone: nullable(str),
        phone_verified_at: nullable(dateTime),
        preferred_language: oneOf(["en", "sw"]),
        notification_channel: oneOf(["in_app", "sms"]),
        message_permission: oneOf(["anyone", "verified", "none"]),
        share_contact: bool,
        founder_profile: nullable(ref("FounderProfileWithProgress")),
        investor_profile: nullable(ref("InvestorProfile")),
        expert_profile: nullable(ref("ExpertProfile")),
        funder: described(nullable(ref("FunderRecord")), "The funder record an investor maintains."),
      }),
    },
  },
  {
    method: "post",
    path: "/auth/email/code",
    summary: "Send a new email verification code",
    description: "Replaces any earlier code. Valid for 15 minutes. Sign-up already sent the first one.",
    access: "user",
    ok: { description: "Whether the email went out.", schema: ref("CodeDelivery") },
    errors: [[409, "ALREADY_VERIFIED", "The email address is already verified."]],
  },
  {
    method: "post",
    path: "/auth/email/verify",
    summary: "Verify the email address",
    access: "user",
    body: codeSchema,
    ok: { description: "The address is verified.", schema: obj({ email_verified: { type: "boolean", const: true } }) },
    errors: [
      [400, "WRONG_CODE", "The code is not right. Counts towards the five tries."],
      [400, "CODE_EXPIRED", "No code is pending, or it has expired."],
      [429, "TOO_MANY_ATTEMPTS", "Five wrong codes. Ask for a new one."],
    ],
  },
  {
    method: "post",
    path: "/auth/password/forgot",
    summary: "Ask for a password reset code",
    description:
      "Emails a six-digit code if the address has an account. The answer is the same whether or not it does, so it cannot be used to find out who is registered. Outside production the answer always carries a `dev_code`, so the flow can be tried without email; for an address with no account it is a made-up code that never works.",
    access: "public",
    body: forgotSchema,
    ok: {
      description: "Always the same message.",
      schema: obj({ message: str, dev_code: described(str, "Only outside production. Real for an address with an account, made up otherwise.") }, ["dev_code"]),
    },
  },
  {
    method: "post",
    path: "/auth/password/reset",
    summary: "Set a new password with a code",
    description: "Also marks the email address verified, since receiving the code proves it is hers. It does not sign her in.",
    access: "public",
    body: resetSchema,
    ok: { description: "The password was changed.", schema: obj({ password_reset: { type: "boolean", const: true } }) },
    errors: [[400, "WRONG_CODE", `${WRONG_CODE} Also returned for an address with no account.`]],
  },
  {
    method: "post",
    path: "/auth/2fa/setup",
    summary: "Start two-step sign-in setup (admins)",
    description:
      "Returns a new secret to add to an authenticator app. It does nothing until POST /auth/2fa/enable proves the app works. The role is checked in the handler, not by the role guard, so an admin can reach this even where `ADMIN_2FA_REQUIRED` is on.",
    access: "user",
    ok: { description: "The secret.", schema: obj({ secret: str, otpauth_url: described(str, "An `otpauth://` link, for a QR code.") }) },
    errors: [
      [403, "FORBIDDEN", NOT_ADMIN],
      [409, "ALREADY_ENABLED", "Two-step sign-in is already on for this account."],
    ],
  },
  {
    method: "post",
    path: "/auth/2fa/enable",
    summary: "Switch two-step sign-in on (admins)",
    description: "Checks a code from the authenticator app and switches two-step sign-in on. The returned token replaces the current one and counts as a two-step session.",
    access: "user",
    body: enableSchema,
    ok: {
      description: "Switched on.",
      schema: obj({ two_factor_enabled: { type: "boolean", const: true }, token: str, expires_at: int }),
    },
    errors: [
      [400, "WRONG_CODE", "The code is not right."],
      [403, "FORBIDDEN", NOT_ADMIN],
      [409, "ALREADY_ENABLED", "Two-step sign-in is already on for this account."],
      [409, "SETUP_FIRST", "POST /auth/2fa/setup has not been called."],
    ],
  },
  {
    method: "post",
    path: "/auth/2fa/verify",
    summary: "Finish a two-step sign-in",
    description:
      "Exchanges the `pending_token` from POST /auth/login, with a code from the authenticator app, for a session. Wrong codes are counted in memory per admin: after five, further tries are refused for about five minutes. The count is lost on restart and is not shared between server processes.",
    access: "public",
    body: verifySchema,
    ok: { description: "A session signed into with two steps.", schema: ref("Session") },
    errors: [
      [400, "WRONG_CODE", "The code is not right."],
      [401, "UNAUTHORIZED", "The pending token is invalid or has expired. Sign in again."],
      [429, "TOO_MANY_ATTEMPTS", "Five wrong codes. Try again in a few minutes."],
    ],
  },
];
