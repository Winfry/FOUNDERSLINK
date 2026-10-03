// Option lists for onboarding. Served by GET /meta/options so the frontend
// does not hardcode them.

export const JOURNEY_TYPES = ["startup", "sme"] as const;

export const BUSINESS_STATUSES = [
  "idea",
  "informal",
  "registered_business_name",
  "limited_company",
] as const;

export const SECTORS = [
  "health",
  "agri",
  "fintech",
  "climate",
  "retail",
  "education",
  "logistics",
  "other",
] as const;

export const STAGES = ["idea", "mvp", "early_revenue", "growth"] as const;

export const INSTRUMENTS = ["equity", "convertible_note", "loan", "grant"] as const;

// Monthly revenue in KES.
export const REVENUE_BANDS = ["under_50k", "50k_to_200k", "200k_to_1m", "over_1m"] as const;
