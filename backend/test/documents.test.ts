import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { purgeExpired } from "../src/modules/vetting/documents.js";
import { prisma } from "../src/shared/db.js";

// Uploading evidence with a vetting application: what is accepted, who
// can open it, and when it is deleted. Files go to a temporary folder.
// Runs against DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  amina: { role: "founder", full_name: "Amina Founder", status: "draft" },
  otieno: { role: "founder", full_name: "Otieno Other", status: "draft" },
  admin: { role: "admin", full_name: "Test Admin", status: "approved" },
} as const;
type Who = keyof typeof people;

const pdf = Buffer.from("%PDF-1.4\n% a tiny test certificate\n%%EOF\n");
let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let documentId = "";

async function call(method: string, path: string, who?: Who, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(who ? { authorization: `Bearer ${tokens[who]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function upload(who: Who, bytes: Buffer, name: string, mime: string, type = "business_registration") {
  const form = new FormData();
  form.append("type", type);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), name);
  const res = await fetch(`${base}/vetting/application/documents`, {
    method: "POST",
    headers: { authorization: `Bearer ${tokens[who]}` },
    body: form,
  });
  return { status: res.status, json: (await res.json()) as any };
}

const onDisk = async () => {
  const row = await prisma.vettingDocument.findUniqueOrThrow({ where: { id: documentId } });
  return row.storage_key ? existsSync(path.join(process.env.UPLOAD_DIR!, row.storage_key)) : false;
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, status } = people[who];
    const email = `doc-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: status, email_verified_at: new Date() } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
});

after(async () => {
  await purgeExpired(new Date("2100-01-01"));
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("a PDF, JPEG or PNG can be uploaded, and nothing else", async () => {
  const ok = await upload("amina", pdf, "certificate.pdf", "application/pdf");
  assert.equal(ok.status, 201);
  assert.equal(ok.json.status, "uploaded");
  assert.equal(ok.json.file_name, "certificate.pdf");
  // Where the file is kept is never told to the uploader.
  assert.equal(ok.json.storage_key, undefined);
  documentId = ok.json.id;
  assert.equal(await onDisk(), true);

  // A text file calling itself a PDF is caught by what it actually contains.
  const fake = await upload("amina", Buffer.from("just some text"), "fake.pdf", "application/pdf");
  assert.equal(fake.json.error.code, "UNSUPPORTED_FILE");
  assert.equal((await upload("amina", Buffer.from("<html>"), "page.html", "text/html")).json.error.code, "UNSUPPORTED_FILE");

  const big = await upload("amina", Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]), "big.pdf", "application/pdf");
  assert.equal(big.json.error.code, "FILE_TOO_LARGE");
  assert.equal((await upload("amina", pdf, "x.pdf", "application/pdf", "national_id")).status, 400);
});

test("a file name is only a label, never a path", async () => {
  const sneaky = await upload("amina", pdf, "../../etc/passwd.pdf", "application/pdf", "other");
  assert.equal(sneaky.json.file_name, "passwd.pdf");
});

test("she sees her documents on her application, and only she can remove one", async () => {
  const mine = await call("GET", "/vetting/application", "amina");
  assert.deepEqual(mine.json.documents.map((d: any) => d.file_name), ["certificate.pdf", "passwd.pdf"]);

  const extra = mine.json.documents[1].id;
  assert.equal((await call("DELETE", `/vetting/application/documents/${extra}`, "otieno")).status, 404);
  assert.equal((await call("DELETE", `/vetting/application/documents/${extra}`, "amina")).json.removed, true);
});

test("only an admin can open the file", async () => {
  const path = `/admin/vetting/documents/${documentId}/file`;
  const asOwner = await fetch(base + path, { headers: { authorization: `Bearer ${tokens.amina}` } });
  assert.equal(asOwner.status, 403);
  assert.equal((await fetch(base + path)).status, 401);

  const asAdmin = await fetch(base + path, { headers: { authorization: `Bearer ${tokens.admin}` } });
  assert.equal(asAdmin.status, 200);
  assert.equal(asAdmin.headers.get("content-type"), "application/pdf");
  assert.match(asAdmin.headers.get("content-disposition")!, /^attachment; filename="certificate\.pdf"$/);
  assert.deepEqual(Buffer.from(await asAdmin.arrayBuffer()), pdf);
});

test("an admin marks a document verified, or rejected with a reason", async () => {
  const review = (body: object) => call("PATCH", `/admin/vetting/documents/${documentId}`, "admin", body);
  assert.equal((await review({ status: "rejected" })).status, 400);
  assert.equal((await call("PATCH", `/admin/vetting/documents/${documentId}`, "amina", { status: "verified" })).status, 403);

  const rejected = await review({ status: "rejected", reason: "The certificate is cut off at the bottom." });
  assert.equal(rejected.json.rejection_reason, "The certificate is cut off at the bottom.");
  const verified = await review({ status: "verified" });
  assert.equal(verified.json.status, "verified");
  assert.equal(verified.json.rejection_reason, null);
});

test("once she submits, her documents are locked", async () => {
  await call("PATCH", "/vetting/application", "amina", { statement: "I run a clinic booking app in Nairobi." });
  // Submitting needs a confirmed phone. The phone code has its own tests.
  await prisma.user.update({ where: { id: ids.amina }, data: { phone: `+2547${String(run).slice(-7)}5`, phone_verified_at: new Date() } });
  assert.equal((await call("POST", "/vetting/application/submit", "amina")).status, 200);

  assert.equal((await upload("amina", pdf, "late.pdf", "application/pdf")).json.error.code, "APPLICATION_LOCKED");
  assert.equal((await call("DELETE", `/vetting/application/documents/${documentId}`, "amina")).json.error.code, "APPLICATION_LOCKED");

  const review = await call("GET", "/admin/vetting/queue", "admin");
  const application = review.json.find((a: any) => a.user.id === ids.amina);
  assert.equal((await call("GET", `/admin/vetting/${application.id}`, "admin")).json.documents.length, 1);
});

test("the file is deleted 30 days after the decision, and the record of the review stays", async () => {
  const application = await prisma.vettingApplication.findUniqueOrThrow({ where: { user_id: ids.amina } });
  await call("POST", `/admin/vetting/${application.id}/decision`, "admin", { decision: "approve", reason: "Certificate checked." });

  const row = await prisma.vettingDocument.findUniqueOrThrow({ where: { id: documentId } });
  const days = (row.delete_after!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 29.9 && days <= 30);

  // Nothing is deleted early.
  await purgeExpired();
  assert.equal(await onDisk(), true);

  // Thirty-one days later.
  const later = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
  assert.ok((await purgeExpired(later)).deleted >= 1);
  assert.equal(await onDisk(), false);

  const gone = await fetch(`${base}/admin/vetting/documents/${documentId}/file`, { headers: { authorization: `Bearer ${tokens.admin}` } });
  assert.equal(gone.status, 410);
  const kept = await prisma.vettingDocument.findUniqueOrThrow({ where: { id: documentId } });
  assert.equal(kept.status, "verified");
  assert.ok(kept.deleted_at);
});
