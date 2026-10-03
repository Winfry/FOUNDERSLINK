import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(8000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Base URL of the AI service. Left empty, the backend uses its own
  // rule-based stand-in so the flow still works.
  AI_SERVICE_URL: z.string().optional(),
  // Shared secret sent to the AI service on every call.
  AI_SERVICE_API_KEY: z.string().optional(),
  // SMS through Africa's Talking. Without the key and username nothing is sent.
  SMS_PROVIDER_USERNAME: z.string().optional(),
  SMS_PROVIDER_API_KEY: z.string().optional(),
  SMS_API_URL: z.string().default("https://api.sandbox.africastalking.com/version1/messaging"),
  NODE_ENV: z.string().default("development"),
});

const parsed = schema.safeParse(process.env);

// Fail at startup, not on the first request that needs a missing value.
if (!parsed.success) {
  console.error("Invalid environment:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
