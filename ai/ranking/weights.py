# How much each signal counts. Hand-picked for the MVP: tune them against
# ai/evaluation/datasets/labelled_matches.jsonl, never by feel alone.

SIGNAL_WEIGHTS = {
    "journey": 0.15,
    "sector": 0.20,
    "stage": 0.15,
    "county": 0.10,
    "amount": 0.20,
    "instrument": 0.05,
    "mandate": 0.15,
    # People matching (co-founders and experts)
    "skills": 0.35,
    "same_skills": 0.05,
    "open": 0.0,
    "sector_interest": 0.15,
    "location": 0.15,
    "commitment": 0.10,
    "profession": 0.30,
    "services": 0.25,
    "availability": 0.15,
    "meaning": 0.15,
}

# Meaning match between the founder's description and the investor's
# mandate, from intfloat/multilingual-e5-small. Measured on 4 October on the
# labelled set (ai/evaluation/eval_matching.py, 14 founders x 18 investors):
#   true fits   median 0.818, range 0.757-0.870
#   non-fits    median 0.799, 90th percentile 0.826, max 0.846
# The two overlap heavily, so a low similarity is never shown as a miss.
# At or above MANDATE_HIGH, which almost no non-fit reaches, it is shown as
# a reason. Re-measure if the model or the investor data changes.
MANDATE_HIGH = 0.84

# Share of the sort score that comes from meaning, relative to the other
# investors in the same request. Bands never depend on it.
MEANING_SHARE = 0.2
