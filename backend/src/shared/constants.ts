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

// Roles a person can sign up as. `admin` is never available at sign-up.
export const SIGNUP_ROLES = ["founder", "investor", "expert"] as const;

export const PROFESSIONS = ["lawyer", "accountant", "mentor", "other"] as const;

export const CHECK_TYPES = [
  "identity",
  "phone",
  "organisation",
  "track_record",
  "professional_register",
  "reference",
] as const;

export const CHECK_METHODS = [
  "manual",
  "otp",
  "provider",
  "brs",
  "lsk",
  "icpak",
  "cma",
  "domain",
  "reference",
] as const;

// What a person can agree to, each on its own.
//   profile_visibility      other approved members may see her profile and match with her
//   ai_matching             her business details may be sent to the AI service
//   eligibility_attributes  she may record women-, youth- or PWD-owned, to check funder eligibility
//   contact                 she may be contacted by SMS or WhatsApp
export const CONSENT_PURPOSES = ["profile_visibility", "ai_matching", "eligibility_attributes", "contact"] as const;
