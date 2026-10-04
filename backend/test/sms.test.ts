import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

// The SMS sender against a fake provider. It pins down what we send, but
// it is not proof that the real Africa's Talking sandbox accepts it.

let seen: { apiKey: string | undefined; body: URLSearchParams };
let status = 201;
const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    seen = { apiKey: req.headers.apikey as string | undefined, body: new URLSearchParams(raw) };
    res.writeHead(status, { "content-type": "application/json" }).end("{}");
  });
});

let sendSms: typeof import("../src/shared/sms.js").sendSms;

before(async () => {
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  // Set before the module loads, because the environment is read once at import.
  process.env.SMS_API_URL = `http://localhost:${(server.address() as AddressInfo).port}`;
  process.env.SMS_PROVIDER_USERNAME = "sandbox";
  process.env.SMS_PROVIDER_API_KEY = "test-key";
  ({ sendSms } = await import("../src/shared/sms.js"));
});

after(() => server.close());

test("an SMS goes to the provider with the key, the number and the message", async () => {
  const result = await sendSms("+254712345678", "Your FoundersLink code is 123456.");
  assert.deepEqual(result, { status: "sent" });
  assert.equal(seen.apiKey, "test-key");
  assert.equal(seen.body.get("username"), "sandbox");
  assert.equal(seen.body.get("to"), "+254712345678");
  assert.equal(seen.body.get("message"), "Your FoundersLink code is 123456.");
});

test("a provider error is reported, not thrown", async () => {
  status = 500;
  assert.deepEqual(await sendSms("+254712345678", "Hello"), { status: "failed", error: "SMS provider answered 500" });
});
