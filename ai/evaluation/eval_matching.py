# Measures investor matching against hand-labelled answers.
# Run from the repository root:
#   python -m ai.evaluation.eval_matching            (structured checks only)
#   python -m ai.evaluation.eval_matching --embed    (also with the embedding model)
#
# Data: data/seed/founders.json (14 demo founders, one described in Swahili),
# data/seed/investors.json (18 demo investors) and
# ai/evaluation/datasets/labelled_matches.jsonl: for each founder, which
# investors a person judged a fit (2 = clearly, 1 = plausibly), by reading
# each investor's mandate. Anything not listed is not a fit.
#
# The labels were written by the team, not by the algorithm, and the set
# is small: treat the numbers as a check, and have a second person review
# the labels before quoting them.

import argparse
import json
import math
from pathlib import Path

from ai.matching.pipeline import recommend
from ai.service.schemas import Candidate, MatchProfile

ROOT = Path(__file__).resolve().parents[2]
FOUNDERS = ROOT / "data" / "seed" / "founders.json"
INVESTORS = ROOT / "data" / "seed" / "investors.json"
LABELS = Path(__file__).parent / "datasets" / "labelled_matches.jsonl"

BAND_ORDER = {"strong": 0, "good": 1, "possible": 2, "not_a_fit": 3}
CANDIDATE_FIELDS = ["kind", "mandate_text", "journey_types", "sectors", "stages", "counties",
                    "instruments", "ticket_min_kes", "ticket_max_kes"]


def load():
    founders = {f["id"]: f for f in json.loads(FOUNDERS.read_text(encoding="utf-8"))}
    investors = json.loads(INVESTORS.read_text(encoding="utf-8"))
    candidates = [Candidate(id=i["name"], **{k: i.get(k, []) for k in CANDIDATE_FIELDS}) for i in investors]
    labels = [json.loads(line) for line in LABELS.read_text(encoding="utf-8").splitlines() if line.strip()]
    return founders, candidates, labels


def profile_of(founder: dict) -> MatchProfile:
    return MatchProfile(**{k: v for k, v in founder.items() if k not in ("id", "business_name")})


def rank_ai(founder: dict, candidates: list[Candidate], embedder) -> list[str]:
    items = recommend(profile_of(founder), candidates, embedder)
    order = sorted(range(len(items)), key=lambda i: (BAND_ORDER[items[i].band], -items[i].score, i))
    return [items[i].candidate_id for i in order]


def rank_sector_only(founder: dict, candidates: list[Candidate], _embedder=None) -> list[str]:
    """A simple baseline: investors whose sectors include hers (or are open) first, in file order."""
    fits = [c.id for c in candidates if not c.sectors or founder["sector"] in c.sectors]
    return fits + [c.id for c in candidates if c.id not in fits]


def metrics(ranked: list[str], relevant: dict[str, int]) -> dict:
    rel = set(relevant)
    r = len(rel)
    dcg = sum(relevant.get(c, 0) / math.log2(i + 2) for i, c in enumerate(ranked[:5]))
    ideal = sum(g / math.log2(i + 2) for i, g in enumerate(sorted(relevant.values(), reverse=True)[:5]))
    return {
        "hit@1": float(ranked[0] in rel),
        "precision@3": len(set(ranked[:3]) & rel) / 3,
        "r_precision": len(set(ranked[:r]) & rel) / r,
        "recall@5": len(set(ranked[:5]) & rel) / r,
        "ndcg@5": dcg / ideal if ideal else 0.0,
    }


def evaluate(rank, founders, candidates, labels, embedder=None, show=False) -> dict:
    totals: dict[str, float] = {}
    for row in labels:
        founder = founders[row["founder_id"]]
        ranked = rank(founder, candidates, embedder)
        m = metrics(ranked, row["relevant"])
        for k, v in m.items():
            totals[k] = totals.get(k, 0.0) + v
        if show:
            top = ", ".join(f"{'✓' if c in row['relevant'] else '✗'} {c.replace(' (demo)', '')}" for c in ranked[:3])
            print(f"  {founder['business_name'].replace(' (demo)', ''):22} {top}")
    return {k: round(v / len(labels), 3) for k, v in totals.items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--embed", action="store_true", help="also measure with the embedding model")
    parser.add_argument("--show", action="store_true", help="print each founder's top three")
    args = parser.parse_args()

    founders, candidates, labels = load()
    print(f"{len(labels)} founders, {len(candidates)} investors, "
          f"{sum(len(l['relevant']) for l in labels)} labelled fits\n")
    print(f"{'Sector-only baseline':32} {evaluate(rank_sector_only, founders, candidates, labels)}")
    print(f"{'FounderLink AI (checks only)':32} {evaluate(rank_ai, founders, candidates, labels, None, args.show)}")

    if args.embed:
        from ai.embeddings.model import load_embedder
        embedder = load_embedder()
        if embedder:
            label = f"FounderLink AI + {embedder.model_name.split('/')[-1]}"
            print(f"{label:32} {evaluate(rank_ai, founders, candidates, labels, embedder, args.show)}")


if __name__ == "__main__":
    main()
