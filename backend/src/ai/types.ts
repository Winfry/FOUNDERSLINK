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

export interface MatchResult {
  funder_id: string;
  fits: boolean;
  score: number;
  reasons: Reason[];
}

export interface Extraction {
  fields: Record<string, unknown>;
  unsure: string[];
}

export type Engine = "ai_service" | "stand_in";
