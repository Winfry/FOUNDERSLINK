import { AppError } from "../../shared/errors.js";

// Too many wrong passwords for one account, or from one address, and
// signing in is paused for a while. This slows down password guessing
// without locking a real member out for long.
//
// The address limit is looser on purpose: in Kenya many phones share one
// public address (mobile networks put customers behind shared addresses),
// so one person's typos must not pause everyone on the same network.
//
// Kept in memory: enough for one server. Run several and this moves to the
// database or a shared cache.

/** Wrong passwords for one email before it is paused. */
export const MAX_FAILURES = 10;
/** Wrong passwords from one address, across all emails, before it is paused. */
export const MAX_FAILURES_PER_ADDRESS = 50;
export const WINDOW_MS = 15 * 60 * 1000;

const failures = new Map<string, number[]>();

const recent = (key: string, now: number) => (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
const keys = (email: string, ip: string) => [
  { key: `email:${email.toLowerCase()}`, max: MAX_FAILURES },
  { key: `ip:${ip}`, max: MAX_FAILURES_PER_ADDRESS },
];

/** Refuses the attempt if this email or address has failed too often lately. */
export function checkLoginAllowed(email: string, ip: string, now = Date.now()) {
  for (const { key, max } of keys(email, ip)) {
    const list = recent(key, now);
    if (list.length >= max) {
      const wait = Math.ceil((WINDOW_MS - (now - list[0]!)) / 60000);
      throw new AppError(429, "TOO_MANY_ATTEMPTS", `Too many wrong attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
    }
  }
}

export function recordLoginFailure(email: string, ip: string, now = Date.now()) {
  // Now and then, forget entries whose failures have all expired, so the
  // map cannot grow without end.
  if (failures.size > 10_000) {
    for (const key of [...failures.keys()]) if (recent(key, now).length === 0) failures.delete(key);
  }
  for (const { key } of keys(email, ip)) failures.set(key, [...recent(key, now), now]);
}

/** A successful sign-in clears that account's count (not the address's). */
export function recordLoginSuccess(email: string) {
  failures.delete(`email:${email.toLowerCase()}`);
}

/** For tests. */
export function resetLoginLimits() {
  failures.clear();
}
