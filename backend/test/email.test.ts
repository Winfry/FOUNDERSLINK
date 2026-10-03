import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

// The email sender against a fake provider. It pins down what we send to
// Resend, but it is not proof that a real email arrives.

let seen: { auth: string | undefined; body: any };
let status = 200;
const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    seen = { auth: req.headers.authorization, body: JSON.parse(raw) };
    res.writeHead(status, { "content-type": "application/json" }).end('{"id":"email_1"}');
  });
});

let sendEmail: typeof import("../src/shared/email.js").sendEmail;

before(async () => {
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  // Set before the module loads, because the environment is read once at import.
  process.env.EMAIL_API_URL = `http://localhost:${(server.address() as AddressInfo).port}`;
  process.env.RESEND_API_KEY = "re_test_key";
  ({ sendEmail } = await import("../src/shared/email.js"));
});

after(() => server.close());

test("an email goes to the provider with the key, the sender, the recipient and the text", async () => {
  const result = await sendEmail("amina@example.com", "Your FounderLink code", "Your FounderLink code is 123456.");
  assert.deepEqual(result, { status: "sent" });
  assert.equal(seen.auth, "Bearer re_test_key");
  assert.deepEqual(seen.body, {
    from: "FounderLink <onboarding@resend.dev>",
    to: ["amina@example.com"],
    subject: "Your FounderLink code",
    text: "Your FounderLink code is 123456.",
  });
});

test("a provider refusal is reported, not thrown", async () => {
  status = 403;
  assert.deepEqual(await sendEmail("someone@example.com", "Hello", "Hello"), { status: "failed", error: "Email provider answered 403" });
});
