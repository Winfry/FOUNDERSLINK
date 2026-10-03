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
}

# Similarity between the founder's description and the funder's mandate,
# from the embedding model. Below LOW it counts as a soft miss; at or above
# HIGH it counts as a clear fit. Calibrate these on the labelled set.
MANDATE_LOW = 0.78
MANDATE_HIGH = 0.84
