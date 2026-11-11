// Loaded before every test file. The tests check the backend's own
// behaviour, so they must not depend on whether an AI service happens to
// be running: with no address, every AI call uses the stand-in.
// (ai-client.test.ts points this at its own fake service.)
process.env.AI_SERVICE_URL = "";
// Likewise no SMS provider, so nothing is ever sent from a test run.
// (sms.test.ts points these at its own fake provider.)
process.env.SMS_PROVIDER_API_KEY = "";
process.env.SMS_PROVIDER_USERNAME = "";
// The M-Pesa confirmation endpoint is off without a secret. Tests turn it on.
process.env.MPESA_CALLBACK_SECRET = "test-callback-secret-0123456789";
// The demo's codes on screen, as the demo runs (see SHOW_DEMO_CODES).
process.env.SHOW_DEMO_CODES = "true";
// And no email provider, so a test run never sends a real email.
// (email.test.ts points these at its own fake provider.)
process.env.RESEND_API_KEY = "";
// No language model either: the Copilot plans with its own rules, and a
// developer's real key in the root .env is never used by a test.
process.env.LLM_API_KEY = "";
// Uploaded files go to a temporary folder, not the project.
process.env.UPLOAD_DIR = `${process.env.TMPDIR ?? "/tmp"}/founderlink-test-uploads`;
