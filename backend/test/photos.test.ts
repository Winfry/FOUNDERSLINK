import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Members' photos: adding, replacing and removing one, and who is shown it.
// Runs against DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  grace: { role: "investor", full_name: "Grace Photo Investor", approved: true },
  amina: { role: "founder", full_name: "Amina Photo Founder", approved: true },
  newcomer: { role: "founder", full_name: "Not Yet Approved", approved: false },
} as const;
type Who = keyof typeof people;

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};

// The smallest valid images: a 1x1 PNG, and the start of a JPEG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1), Buffer.from([0xff, 0xd9])]);

async function call(method: string, path: string, who?: Who, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(who ? { authorization: `Bearer ${tokens[who]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function upload(who: Who, bytes: Buffer, type: string) {
  const form = new FormData();
  form.append("photo", new Blob([new Uint8Array(bytes)], { type }), "me.jpg");
  const res = await fetch(`${base}/me/photo`, { method: "PUT", headers: { authorization: `Bearer ${tokens[who]}` }, body: form });
  return { status: res.status, json: (await res.json()) as any };
}

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, approved } = people[who];
    const email = `photo-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: approved ? "approved" : "draft" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
    await prisma.consent.create({ data: { user_id: user.id, purpose: "profile_visibility", granted: true, granted_at: new Date() } });
  }
});

after(async () => {
  for (const who of Object.keys(ids) as Who[]) await call("DELETE", "/me/photo", who);
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("she adds a photo; it is on /me and served at its address", async () => {
  assert.equal((await call("GET", "/me", "grace")).json.photo_url, null);
  const saved = await upload("grace", PNG, "image/png");
  assert.equal(saved.status, 200);
  assert.match(saved.json.photo_url, /^\/media\/photos\/[\w-]{20,}$/);
  assert.equal((await call("GET", "/me", "grace")).json.photo_url, saved.json.photo_url);

  const served = await fetch(base + saved.json.photo_url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.equal(served.headers.get("cache-control"), "private, max-age=86400");
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), PNG);
});

test("a new photo gets a new address, and the old one stops working", async () => {
  const first = (await upload("amina", JPEG, "image/jpeg")).json.photo_url;
  const second = (await upload("amina", PNG, "image/png")).json.photo_url;
  assert.notEqual(first, second);
  assert.equal((await fetch(base + first)).status, 404);
  assert.equal((await fetch(base + second)).status, 200);
});

test("only a real JPEG or PNG is taken, never anything claiming to be one", async () => {
  const pdf = await upload("newcomer", Buffer.from("%PDF-1.4 not a photo"), "image/jpeg");
  assert.equal(pdf.status, 400);
  assert.equal(pdf.json.error.code, "UNSUPPORTED_FILE");
  const gif = await upload("newcomer", Buffer.from("GIF89a"), "image/gif");
  assert.equal(gif.json.error.code, "UNSUPPORTED_FILE");
  assert.equal((await call("GET", "/me", "newcomer")).json.photo_url, null);
});

test("her face goes with her name: a member's page shows it to approved members", async () => {
  const grace = (await call("GET", "/me", "grace")).json.photo_url;
  const page = await call("GET", `/profiles/${ids.grace}`, "amina");
  assert.equal(page.status, 200);
  assert.equal(page.json.photo_url, grace);
  // Not to someone not yet approved: the page itself is closed to her.
  assert.equal((await call("GET", `/profiles/${ids.grace}`, "newcomer")).json.error.code, "APPROVAL_REQUIRED");
});

test("removing it shows her initials again, and the address stops working", async () => {
  const url = (await call("GET", "/me", "grace")).json.photo_url;
  const removed = await call("DELETE", "/me/photo", "grace");
  assert.equal(removed.status, 200);
  assert.equal(removed.json.photo_url, null);
  assert.equal((await call("GET", "/me", "grace")).json.photo_url, null);
  assert.equal((await fetch(base + url)).status, 404);
  // Removing again is fine.
  assert.equal((await call("DELETE", "/me/photo", "grace")).status, 200);
});

test("a made-up address finds nothing", async () => {
  assert.equal((await fetch(`${base}/media/photos/not-a-real-token-at-all-xyz`)).status, 404);
});
