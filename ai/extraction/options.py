# Allowed values for profile fields. These must match
# backend/src/shared/constants.ts exactly: the backend drops any extracted
# value that is not in its lists.

JOURNEY_TYPES = ["startup", "sme"]

BUSINESS_STATUSES = ["idea", "informal", "registered_business_name", "limited_company"]

SECTORS = ["health", "agri", "fintech", "climate", "retail", "education", "logistics", "other"]

STAGES = ["idea", "mvp", "early_revenue", "growth"]

INSTRUMENTS = ["equity", "convertible_note", "loan", "grant"]

REVENUE_BANDS = ["under_50k", "50k_to_200k", "200k_to_1m", "over_1m"]

COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
    "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
    "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
    "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
    "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
    "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
]
