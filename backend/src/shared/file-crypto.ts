// Uploaded documents are encrypted on disk (TEAM_DECISIONS D7, D12;
// FINAL_VERIFICATION section 4, item 9). Each file is sealed with
// AES-256-GCM, which also detects any change to the file, and is opened
// only in memory, when a party to the deal or an admin downloads it.
//
// On disk: "FLENC1" | 12-byte IV | 16-byte tag | ciphertext. A file without
// that start was stored before encryption and is read as it is, so nothing
// already uploaded stops opening.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { env } from "../config/env.js";

const MAGIC = Buffer.from("FLENC1");
const IV_BYTES = 12;
const TAG_BYTES = 16;

// The key comes from UPLOAD_ENCRYPTION_KEY: 32 bytes, as base64 or hex.
// Production refuses to start without it (config/env.ts). Elsewhere, so a
// laptop works with no extra setup, a key is derived from JWT_SECRET and a
// warning says so once.
let cached: Buffer | null = null;
function key(): Buffer {
  if (cached) return cached;
  const given = env.UPLOAD_ENCRYPTION_KEY;
  if (given) {
    cached = /^[0-9a-f]{64}$/i.test(given) ? Buffer.from(given, "hex") : Buffer.from(given, "base64");
    if (cached.length !== 32) throw new Error("UPLOAD_ENCRYPTION_KEY must be 32 bytes, as base64 or 64 hex characters");
  } else {
    console.warn("UPLOAD_ENCRYPTION_KEY is not set: uploaded files are encrypted with a key derived from JWT_SECRET. Set it before going live.");
    cached = createHash("sha256").update(`founderslink-uploads:${env.JWT_SECRET}`).digest();
  }
  return cached;
}

export function encrypt(plain: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

export function decrypt(stored: Buffer): Buffer {
  if (!stored.subarray(0, MAGIC.length).equals(MAGIC)) return stored;
  const iv = stored.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
  const tag = stored.subarray(MAGIC.length + IV_BYTES, MAGIC.length + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  // Throws if the file was changed on disk: a tampered document is never served.
  return Buffer.concat([decipher.update(stored.subarray(MAGIC.length + IV_BYTES + TAG_BYTES)), decipher.final()]);
}

// A stored file, opened, to send to someone allowed to see it.
export async function readStored(filePath: string): Promise<Buffer> {
  return decrypt(await readFile(filePath));
}
