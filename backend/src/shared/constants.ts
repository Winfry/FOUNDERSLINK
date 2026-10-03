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

export const ELIGIBILITY_FLAGS = ["women_owned", "youth_owned", "pwd_owned"] as const;

export const FUNDER_KINDS = [
  "angel",
  "vc",
  "accelerator",
  "grant",
  "government_fund",
  "bank",
  "sacco",
] as const;

export const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
] as const;
