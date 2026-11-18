import { described, nullable, obj, str, type Op } from "../builder.js";

export const tag = {
  name: "Photos",
  description:
    "A member's photo, so people can put a face to a business. Optional, and a photo of her, never of an ID document. Her photo is shown wherever her name is: a member whose name is hidden (not yet verified, or not visible) has a hidden photo too.",
};

const photoUrl = described(nullable(str), "Where her photo is served, relative to the API: `/media/photos/<token>`. Null when she has none.");

export const ops: Op[] = [
  {
    method: "put",
    path: "/me/photo",
    summary: "Add or replace my photo",
    description:
      "One JPEG or PNG, as `multipart/form-data` with the field `photo`, up to 2 MB (the app crops it square and shrinks it first). Stored encrypted on the server's disk. A new photo gets a new address, so the old one stops working.",
    access: "user",
    requestBody: {
      required: true,
      content: { "multipart/form-data": { schema: { type: "object", properties: { photo: { type: "string", format: "binary" } }, required: ["photo"] } } },
    },
    ok: { description: "Saved.", schema: obj({ photo_url: str }) },
    errors: [
      [400, "NO_FILE", "No `photo` part."],
      [400, "UNSUPPORTED_FILE", "Not a JPEG or PNG, or the content does not match the claimed type."],
      [400, "FILE_TOO_LARGE", "The photo is larger than 2 MB."],
    ],
  },
  {
    method: "delete",
    path: "/me/photo",
    summary: "Remove my photo",
    description: "She is shown by her initials again. Removing a photo she does not have is not an error.",
    access: "user",
    ok: { description: "Removed.", schema: obj({ photo_url: photoUrl }) },
  },
  {
    method: "get",
    path: "/media/photos/:token",
    summary: "A member's photo",
    description:
      "No token needed: the address is the secret. It is random, changes with every new photo, and is only given out where her name is shown. Sent with `Cache-Control: private`.",
    access: "public",
    params: { token: described(str, "The random part of a `photo_url`.") },
    ok: {
      description: "The photo.",
      content: { "image/jpeg": { schema: { type: "string", format: "binary" } }, "image/png": { schema: { type: "string", format: "binary" } } },
    },
    errors: [[404, "NOT_FOUND", "No photo at this address (it was replaced or removed)."]],
  },
];
