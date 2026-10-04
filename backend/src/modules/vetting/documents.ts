// Evidence uploaded with a vetting application (TEAM_DECISIONS D7).
//
// What this does and does not do:
// - Files are kept on this machine's disk, under a name we choose, and
//   are served only to admins.
// - A file is deleted 30 days after the decision on the application.
//   The record of what was reviewed, and the outcome, stays.
// - Files are NOT encrypted on disk. Do not describe them as encrypted.
// - ID documents are not asked for. Identity is checked by an admin by hand.

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";

export const DOCUMENT_TYPES = [
  "business_registration",
  "kra_pin_certificate",
  "organisation_proof",
  "professional_certificate",
  "track_record",
  "other",
] as const;

export const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENTS = 10;
const KEEP_DAYS = 30;
const EDITABLE = ["draft", "needs_info"];

// The first bytes each allowed kind of file starts with. The type the
// uploader claims is checked against what the file actually is.
const SIGNATURES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};

export const uploadSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  label: z.string().trim().max(120).optional(),
});

export const reviewSchema = z
  .object({ status: z.enum(["verified", "rejected"]), reason: z.string().trim().min(5).max(500).optional() })
  .refine((r) => r.status === "verified" || r.reason, "Say why the document is rejected");

export const fileOf = (key: string) => path.join(env.UPLOAD_DIR, key);

const publicFields = {
  id: true,
  type: true,
  label: true,
  file_name: true,
  mime_type: true,
  size_bytes: true,
  status: true,
  rejection_reason: true,
  uploaded_at: true,
  reviewed_at: true,
  deleted_at: true,
} as const;

export function listDocuments(applicationId: string) {
  return prisma.vettingDocument.findMany({ where: { application_id: applicationId }, select: publicFields, orderBy: { uploaded_at: "asc" } });
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Refuses anything that is not really a PDF, JPEG or PNG.
export function checkFile(file: UploadedFile | undefined): asserts file is UploadedFile {
  if (!file) throw new AppError(400, "NO_FILE", "Attach a file");
  const signature = SIGNATURES[file.mimetype];
  if (!signature || !signature.every((byte, i) => file.buffer[i] === byte)) {
    throw new AppError(400, "UNSUPPORTED_FILE", "Upload a PDF, JPEG or PNG");
  }
}

// Writes the file under a name of ours and returns that name. Her file
// name is kept only to show it, and is never used as a path.
export async function storeFile(buffer: Buffer) {
  const key = randomUUID();
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  await writeFile(fileOf(key), buffer);
  return key;
}

export const KEEP_MS = KEEP_DAYS * 24 * 60 * 60 * 1000;

export async function uploadDocument(userId: string, file: UploadedFile | undefined, input: z.infer<typeof uploadSchema>) {
  checkFile(file);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { approval_status: true } });
  if (!EDITABLE.includes(user.approval_status)) {
    throw conflict("APPLICATION_LOCKED", "Your application has been submitted and cannot be changed now");
  }

  const application = await prisma.vettingApplication.upsert({ where: { user_id: userId }, create: { user_id: userId }, update: {} });
  if ((await prisma.vettingDocument.count({ where: { application_id: application.id } })) >= MAX_DOCUMENTS) {
    throw conflict("TOO_MANY_DOCUMENTS", `An application can have at most ${MAX_DOCUMENTS} documents`);
  }

  const key = await storeFile(file.buffer);

  return prisma.vettingDocument.create({
    data: {
      application_id: application.id,
      type: input.type,
      label: input.label ?? null,
      file_name: path.basename(file.originalname).slice(0, 120),
      mime_type: file.mimetype,
      size_bytes: file.size,
      storage_key: key,
    },
    select: publicFields,
  });
}

export async function removeFile(key: string | null) {
  if (key) await unlink(fileOf(key)).catch(() => undefined);
}

export async function removeDocument(userId: string, documentId: string) {
  const document = await prisma.vettingDocument.findFirst({
    where: { id: documentId, application: { user_id: userId } },
    include: { application: { select: { user: { select: { approval_status: true } } } } },
  });
  if (!document) throw notFound("No such document");
  if (!EDITABLE.includes(document.application.user.approval_status)) {
    throw conflict("APPLICATION_LOCKED", "Your application has been submitted and cannot be changed now");
  }
  await removeFile(document.storage_key);
  await prisma.vettingDocument.delete({ where: { id: documentId } });
  return { id: documentId, removed: true };
}

// For an admin: where the file is, to send it.
export async function fileForAdmin(documentId: string) {
  const document = await prisma.vettingDocument.findUnique({ where: { id: documentId } });
  if (!document) throw notFound("No such document");
  if (!document.storage_key) throw new AppError(410, "FILE_DELETED", "This file was deleted after the retention period");
  return { path: path.resolve(fileOf(document.storage_key)), mime_type: document.mime_type, file_name: document.file_name };
}

export async function reviewDocument(adminId: string, documentId: string, input: z.infer<typeof reviewSchema>) {
  const { count } = await prisma.vettingDocument.updateMany({
    where: { id: documentId },
    data: {
      status: input.status,
      rejection_reason: input.status === "rejected" ? input.reason : null,
      reviewed_by: adminId,
      reviewed_at: new Date(),
    },
  });
  if (count === 0) throw notFound("No such document");
  return prisma.vettingDocument.findUniqueOrThrow({ where: { id: documentId }, select: publicFields });
}

// Called when an application is decided: its files are kept another 30 days.
export function scheduleDeletion(applicationId: string, now = new Date()) {
  return prisma.vettingDocument.updateMany({
    where: { application_id: applicationId, storage_key: { not: null } },
    data: { delete_after: new Date(now.getTime() + KEEP_MS) },
  });
}

// Deletes the files whose time is up. Safe to run as often as you like.
export async function purgeExpired(now = new Date()) {
  const due = await prisma.vettingDocument.findMany({ where: { delete_after: { lte: now }, storage_key: { not: null } } });
  for (const document of due) {
    await removeFile(document.storage_key);
    await prisma.vettingDocument.update({ where: { id: document.id }, data: { storage_key: null, deleted_at: now } });
  }
  // Documents shared in a deal follow the same rule.
  const dealDue = await prisma.dealDocument.findMany({ where: { delete_after: { lte: now }, storage_key: { not: null } } });
  for (const document of dealDue) {
    await removeFile(document.storage_key);
    await prisma.dealDocument.update({ where: { id: document.id }, data: { storage_key: null, deleted_at: now } });
  }
  return { deleted: due.length + dealDue.length };
}

// Called before an account is deleted, so no file outlives its owner.
export async function removeFilesOf(userId: string) {
  const documents = await prisma.vettingDocument.findMany({ where: { application: { user_id: userId } }, select: { storage_key: true } });
  const shared = await prisma.dealDocument.findMany({ where: { user_id: userId }, select: { storage_key: true } });
  await Promise.all([...documents, ...shared].map((d) => removeFile(d.storage_key)));
}
