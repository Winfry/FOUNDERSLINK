// Loaded before every test file. The tests check the backend's own
// behaviour, so they must not depend on whether an AI service happens to
// be running: with no address, every AI call uses the stand-in.
// (ai-client.test.ts points this at its own fake service.)
process.env.AI_SERVICE_URL = "";
// Likewise no SMS provider, so nothing is ever sent from a test run.
// (sms.test.ts points these at its own fake provider.)
process.env.SMS_PROVIDER_API_KEY = "";
process.env.SMS_PROVIDER_USERNAME = "";
// So no test ever sends a real SMS, whatever this machine's settings are.
for (const name of ["BONGA_CLIENT_ID", "BONGA_API_KEY", "BONGA_SECRET", "BONGA_SERVICE_ID", "BONGA_SEND_SMS_URL"]) process.env[name] = "";
// The M-Pesa confirmation endpoint is off without a secret. Tests turn it on.
process.env.MPESA_CALLBACK_SECRET = "test-callback-secret-0123456789";
// And no email provider, so a test run never sends a real email.
// (email.test.ts points these at its own fake provider.)
process.env.RESEND_API_KEY = "";
// Uploaded files go to a temporary folder, not the project.
process.env.UPLOAD_DIR = `${process.env.TMPDIR ?? "/tmp"}/founderlink-test-uploads`;
