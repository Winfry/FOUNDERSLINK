// The only place the backend talks to the AI service. Contract:
// docs/FUNDING_FLOW.md section 4. Every answer from the service is
// validated before use, and a missing, slow or invalid answer falls back
// to the stand-in so the founder still gets a result.

import { z } from "zod";
import { env } from "../config/env.js";
import * as standin from "./standin.js";
import {
  BANDS,
  RISK_LEVELS,
  type Engine,
  type Extraction,
  type FitExplanation,
  type MatchFunder,
  type MatchProfile,
  type MatchResult,
  type RiskAssessment,
  type RiskInput,
  type TrackRecordItem,
} from "./types.js";

const TIMEOUT_MS = 8000;

// Removes contact details from free text before it leaves the backend.
// Emails and Kenyan phone numbers only: the business content stays.
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]")
    .replace(/(\+?254|0)[17]\d{8}\b/g, "[phone removed]");
}

// The service answers with the fields it found, as a flat object.
const extractionSchema = z.record(z.string(), z.unknown());

const signalSchema = z.object({ signal: z.string(), fits: z.boolean(), text: z.string() });

const recommendSchema = z.array(
  z.object({
    candidate_id: z.string(),
    score: z.number().min(0).max(1),
    band: z.enum(BANDS),
    signals: z.array(signalSchema),
    explanation: z.string(),
  }),
);

const explainSchema = z.object({
  band: z.enum(BANDS),
  components: z.array(signalSchema),
  reasons: z.array(z.string()),
  track_record_highlights: z.array(z.string()).default([]),
});

const riskSchema = z.object({
  risk_level: z.enum(RISK_LEVELS),
  signals: z.array(z.string()),
});

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T | null> {
  if (!env.AI_SERVICE_URL) return null;

  try {
    const res = await fetch(env.AI_SERVICE_URL + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The AI service is internal: it only answers callers that hold the key.
        ...(env.AI_SERVICE_API_KEY ? { "x-internal-api-key": env.AI_SERVICE_API_KEY } : {}),
      },
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
  const free_text = redact(text);
  const fields = await post("/extract-profile", { free_text, language }, extractionSchema);
  if (fields) return { fields, unsure: standin.missingCoreFields(fields), engine: "ai_service" };
  return { ...standin.extractProfile(free_text), engine: "stand_in" };
}

export async function matchFunders(
  profile: MatchProfile,
  funders: MatchFunder[],
): Promise<{ results: MatchResult[]; engine: Engine }> {
  const safeProfile = { ...profile, description: redact(profile.description) };
  const answer = await post("/recommend", { profile: safeProfile, candidates: funders }, recommendSchema);

  // The "not for you" list needs a verdict for every funder that was sent.
  const answered = new Set(answer?.map((r) => r.candidate_id));
  if (answer && funders.every((f) => answered.has(f.id))) {
    const results = answer.map((r) => ({
      funder_id: r.candidate_id,
      band: r.band,
      score: r.score,
      reasons: r.signals,
      explanation: r.explanation,
    }));
    return { results, engine: "ai_service" };
  }
  return { results: standin.matchFunders(safeProfile, funders), engine: "stand_in" };
}

export async function explainFit(
  profile: MatchProfile,
  funder: MatchFunder,
  track: TrackRecordItem[],
  language = "en",
): Promise<FitExplanation & { engine: Engine }> {
  const safeProfile = { ...profile, description: redact(profile.description) };
  const body = { profile: safeProfile, candidate: funder, track_record: track, language };
  const answer = await post("/explain-fit", body, explainSchema);
  if (answer) return { ...answer, engine: "ai_service" };
  return { ...standin.explainFit(safeProfile, funder, track), engine: "stand_in" };
}

export async function vettingRiskSignals(input: RiskInput): Promise<RiskAssessment & { engine: Engine }> {
  const application = {
    ...input,
    statement: input.statement && redact(input.statement),
    bio: input.bio && redact(input.bio),
  };
  const answer = await post("/vetting/risk-signals", { application }, riskSchema);
  if (answer) return { ...answer, engine: "ai_service" };
  return { ...standin.riskSignals(application), engine: "stand_in" };
}
