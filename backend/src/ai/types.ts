// The shapes exchanged with the AI service (docs/FUNDING_FLOW.md section 4).
// Nothing here identifies a person: no names, emails, phone or ID numbers,
// and no eligibility flags, because those must never affect ranking.

export interface MatchProfile {
  journey_type: string;
  business_status: string;
  description: string;
  sector: string;
  county: string;
  funding_amount_kes: number | null;
  use_of_funds: string | null;
  stage: string | null;
  instruments: string[];
  months_trading: number | null;
  monthly_revenue_band: string | null;
  has_employees: boolean | null;
  handles_personal_data: boolean | null;
}

export interface MatchFunder {
  id: string;
  kind: string;
  mandate_text: string;
  journey_types: string[];
  sectors: string[];
  stages: string[];
  counties: string[];
  instruments: string[];
  ticket_min_kes: number;
  ticket_max_kes: number;
}

export interface Reason {
  signal: string;
  fits: boolean;
  text: string;
}

// How well a funder fits. Shown to founders in place of a number, because
// a score from hand-picked weights would claim precision it does not have.
export const BANDS = ["strong", "good", "possible", "not_a_fit"] as const;
export type Band = (typeof BANDS)[number];

export interface MatchResult {
  funder_id: string;
  band: Band;
  // Used for sorting only. Never sent to the frontend.
  score: number;
  reasons: Reason[];
  explanation: string;
}

export interface Extraction {
  fields: Record<string, unknown>;
  unsure: string[];
}

export type Engine = "ai_service" | "stand_in";

// What the AI is told about a past investment. No company names.
export interface TrackRecordItem {
  sector: string;
  stage: string | null;
  source: string;
}

export interface FitExplanation {
  band: Band;
  components: Reason[];
  reasons: string[];
  track_record_highlights: string[];
}

// The parts of a vetting application the AI may read. The phone number
// and the full email address stay in the backend.
export interface RiskInput {
  role: string;
  statement: string | null;
  bio: string | null;
  organisation_name: string | null;
  organisation_website: string | null;
  email_domain: string;
}

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface RiskAssessment {
  risk_level: RiskLevel;
  signals: string[];
}

// What the rules need to know about a compliance item to decide whether
// it applies to a business.
export interface ApplicableItem {
  id: string;
  scope: string;
  deal_type: string | null;
  applies_when: unknown;
}

export interface Citation {
  source: string;
  url: string;
  last_verified: string | null;
}

export interface ComplianceAnswer {
  answer: string;
  citations: Citation[];
  confident: boolean;
  suggest_expert: boolean;
}

// What the stand-in may answer from: an item, and whether it has been
// checked against an official source recently enough to be quoted.
export interface AnswerSource {
  id: string;
  title: string;
  why: string | null;
  institution: string | null;
  source_url: string | null;
  last_verified_at: Date | null;
  needs_review: boolean;
}

export interface ModerationResult {
  flagged: boolean;
  reasons: string[];
}
