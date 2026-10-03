// The only place the backend talks to the AI service. Contract:
// docs/FUNDING_FLOW.md section 4. Every answer from the service is
// validated before use, and a missing, slow or invalid answer falls back
// to the stand-in so the founder still gets a result.

import { z } from "zod";
import { env } from "../config/env.js";
import * as standin from "./standin.js";
import type { Engine, Extraction, MatchFunder, MatchProfile, MatchResult } from "./types.js";

const TIMEOUT_MS = 8000;

// Removes contact details from free text before it leaves the backend.
// Emails and Kenyan phone numbers only: the business content stays.
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]")
    .replace(/(\+?254|0)[17]\d{8}\b/g, "[phone removed]");
}

const extractionSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
  unsure: z.array(z.string()).default([]),
});

const matchSchema = z.object({
  results: z.array(
    z.object({
      funder_id: z.string(),
      fits: z.boolean(),
      score: z.number().min(0).max(1),
      reasons: z.array(z.object({ signal: z.string(), fits: z.boolean(), text: z.string() })),
    }),
  ),
});

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T | null> {
  if (!env.AI_SERVICE_URL) return null;

  try {
    const res = await fetch(env.AI_SERVICE_URL + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`AI service answered ${res.status}`);
    return schema.parse(await res.json());
  } catch (err) {
    console.warn(`AI service call to ${path} failed, using the stand-in:`, err);
    return null;
  }
}

export async function extractProfile(
  text: string,
  language?: string,
): Promise<Extraction & { engine: Engine }> {
  const clean = redact(text);
  const answer = await post("/extract-profile", { text: clean, language }, extractionSchema);
  if (answer) return { ...answer, engine: "ai_service" };
  return { ...standin.extractProfile(clean), engine: "stand_in" };
}

export async function matchFunders(
  profile: MatchProfile,
  funders: MatchFunder[],
): Promise<{ results: MatchResult[]; engine: Engine }> {
  const safeProfile = { ...profile, description: redact(profile.description) };
  const answer = await post("/match-funders", { profile: safeProfile, funders }, matchSchema);

  // The "not for you" list needs a verdict for every funder that was sent.
  const answered = new Set(answer?.results.map((r) => r.funder_id));
  if (answer && funders.every((f) => answered.has(f.id))) {
    return { results: answer.results, engine: "ai_service" };
  }
  return { results: standin.matchFunders(safeProfile, funders), engine: "stand_in" };
}
