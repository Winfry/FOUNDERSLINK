import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

// The Bonga SMS sender against a fake provider. It pins down what we
// send, but it is not proof that the real Bonga service accepts it.

let seen: URLSearchParams;
let answer: object = { status: 222, status_message: "success", unique_id: "abc", credits: 10 };
const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    seen = new URLSearchParams(raw);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(answer));
  });
});

let sendSms: typeof import("../src/shared/sms.js").sendSms;

before(async () => {
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  // Set before the module loads, because the environment is read once at import.
  process.env.BONGA_SEND_SMS_URL = `http://localhost:${(server.address() as AddressInfo).port}`;
  process.env.BONGA_CLIENT_ID = "client";
  process.env.BONGA_API_KEY = "key";
  process.env.BONGA_SECRET = "secret";
  process.env.BONGA_SERVICE_ID = "service";
  ({ sendSms } = await import("../src/shared/sms.js"));
});

after(() => server.close());

test("with Bonga's settings filled in, an SMS goes to Bonga with the number without its plus sign", async () => {
  assert.deepEqual(await sendSms("+254712345678", "Your FoundersLink code is 123456."), { status: "sent" });
  assert.equal(seen.get("apiClientID"), "client");
  assert.equal(seen.get("key"), "key");
  assert.equal(seen.get("secret"), "secret");
  assert.equal(seen.get("serviceID"), "service");
  assert.equal(seen.get("MSISDN"), "254712345678");
  assert.equal(seen.get("txtMessage"), "Your FoundersLink code is 123456.");
});

test("Bonga refusing the message is reported with its own words, not thrown", async () => {
  // Bonga answers 200 even when it refuses.
  answer = { status: 666, status_message: "Insufficient credits" };
  assert.deepEqual(await sendSms("+254712345678", "Hello"), { status: "failed", error: "Insufficient credits" });
});
