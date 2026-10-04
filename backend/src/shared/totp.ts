// Time-based one-time codes (RFC 6238), the kind an authenticator app
// shows: six digits that change every 30 seconds. The app and the
// backend share a secret, and each works the code out from the secret
// and the time. Nothing is sent anywhere, so it needs no SMS or email.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Buffer): string {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

function base32Decode(text: string): Buffer {
  let bits = "";
  for (const ch of text.replace(/=+$/, "").toUpperCase()) bits += BASE32.indexOf(ch).toString(2).padStart(5, "0");
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((b) => parseInt(b, 2)));
}

export const generateSecret = () => base32Encode(randomBytes(20));

// The code for a given moment.
export function codeAt(secret: string, timeMs: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 1000 / STEP_SECONDS)));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const number = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(number % 10 ** DIGITS).padStart(DIGITS, "0");
}

// Accepts the current code, and the one just before or after it, to
// allow for a phone's clock being a little off.
export function verifyCode(secret: string, code: string, nowMs = Date.now()): boolean {
  return [-1, 0, 1].some((step) => {
    const expected = codeAt(secret, nowMs + step * STEP_SECONDS * 1000);
    return expected.length === code.length && timingSafeEqual(Buffer.from(expected), Buffer.from(code));
  });
}

// What an authenticator app reads from a QR code.
export function otpauthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`FoundersLink:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=FoundersLink&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
