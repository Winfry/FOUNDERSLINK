import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import { prisma } from "../../shared/db.js";
import { AppError, notFound } from "../../shared/errors.js";
import { readStored } from "../../shared/file-crypto.js";
import { fileOf, storeFile, type UploadedFile } from "../vetting/documents.js";

// A member's photo: a face to put to a business. It is optional, and it is
// a photo of her, not of an ID: FoundersLink never collects ID documents
// (TEAM_DECISIONS D10). The app shrinks it to about 600 pixels before it
// is sent, so 2 MB is plenty.
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};

// Where her photo is served. The token is random and changes with every
// new photo; it is only ever given out where her name is shown.
export const photoUrlOf = (token: string) => `/media/photos/${token}`;

function checkPhoto(file: UploadedFile | undefined): asserts file is UploadedFile {
  if (!file) throw new AppError(400, "NO_FILE", "Attach a photo");
  const signature = SIGNATURES[file.mimetype];
  if (!signature || !signature.every((byte, i) => file.buffer[i] === byte)) {
    throw new AppError(400, "UNSUPPORTED_FILE", "Upload a JPEG or PNG photo");
  }
}

async function removeFile(key: string) {
  // A file already gone is fine: the row is what matters.
  await unlink(fileOf(key)).catch(() => undefined);
}

/** Adds her photo, or replaces the one she had. */
export async function setPhoto(userId: string, file: UploadedFile | undefined) {
  checkPhoto(file);
  const storage_key = await storeFile(file.buffer);
  const token = randomBytes(24).toString("base64url");
  const earlier = await prisma.profilePhoto.findUnique({ where: { user_id: userId } });
  const data = { token, storage_key, mime_type: file.mimetype, size_bytes: file.size };
  await prisma.profilePhoto.upsert({ where: { user_id: userId }, create: { user_id: userId, ...data }, update: data });
  if (earlier) await removeFile(earlier.storage_key);
  return { photo_url: photoUrlOf(token) };
}

/** Removes her photo: she is shown by her initials again. */
export async function removePhoto(userId: string) {
  const earlier = await prisma.profilePhoto.findUnique({ where: { user_id: userId } });
  if (earlier) {
    await prisma.profilePhoto.delete({ where: { user_id: userId } });
    await removeFile(earlier.storage_key);
  }
  return { photo_url: null };
}

/** The photo at an address, opened in memory to send. */
export async function photoByToken(token: string) {
  const photo = await prisma.profilePhoto.findUnique({ where: { token } });
  if (!photo) throw notFound("No such photo");
  return { mime_type: photo.mime_type, body: await readStored(fileOf(photo.storage_key)) };
}

/** Photo addresses for people whose names are being shown, by user id. */
export async function photoUrls(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.profilePhoto.findMany({ where: { user_id: { in: [...new Set(userIds)] } }, select: { user_id: true, token: true } });
  return new Map(rows.map((r) => [r.user_id, photoUrlOf(r.token)]));
}

export async function photoUrlFor(userId: string): Promise<string | null> {
  return (await photoUrls([userId])).get(userId) ?? null;
}
