"""
Search API route for FoodLens AI.

Handles POST /search with the full Phase 2/3 pipeline:
  Query → Gemini NLU → Zomato Scrape → Smart Filtering → Relevance Ranking → Explanations → Response

Phase 3 fix: rank_with_intent() is called ONCE inside search_with_intent().
The route no longer calls it again — doing so was re-ranking with zero relevance context.
"""

import logging

from fastapi import APIRouter

from schemas.search import SearchRequest
from services.search_service import search_with_intent
from services.explanation_service import generate_explanations, generate_hero_explanation

from services.ranking_service import (
    get_best_overall_option,
    get_cheapest_option,
    get_fastest_option,
    get_highest_rated_option,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_relevant_only(results: list[dict], min_score: float = 0.40) -> list[dict]:
    """
    Return only results that passed the relevance threshold.
    Falls back to full list if none qualify (prevents empty category winners).
    Used for category winner selection so cheapest/fastest/highest_rated
    are always picked from food-relevant restaurants, not random ones.
    """
    relevant = [r for r in results if r.get("_relevance_score", 1.0) >= min_score]
    return relevant if relevant else results


@router.post("/search")
def search(request: SearchRequest):
    """
    Search for restaurants using natural language.

    Returns ranked results plus category winners (best overall, cheapest,
    fastest delivery, highest rated), with AI-generated explanations
    and the extracted search intent.
    """
    # ── Step 1: Full pipeline (intent → scrape → filter → rank) ─────────
    # rank_with_intent() is called INSIDE search_with_intent() — do NOT
    # call it again here or it re-ranks without the relevance layer.
    search_result = search_with_intent(request.query)

    intent  = search_result["intent"]
    results = search_result["results"]   # already relevance-ranked

    if not results:
        return {
            "query":          request.query,
            "intent":         intent.model_dump(),
            "results":        [],
            "best_overall":   None,
            "cheapest":       None,
            "fastest":        None,
            "highest_rated":  None,
        }

    # ── Step 2: Category winners (from RELEVANT results only) ────────────
    # Previously these ran on ALL results, so "cheapest" could be a pizza
    # place on a biryani search. Now they only consider relevant restaurants.
    relevant_pool = _get_relevant_only(results)

    best_overall  = get_best_overall_option(relevant_pool)
    cheapest      = get_cheapest_option(relevant_pool)
    fastest       = get_fastest_option(relevant_pool)
    highest_rated = get_highest_rated_option(relevant_pool)

    # Fallback to top-ranked result if any winner is None
    fallback      = results[0]
    best_overall  = best_overall  or fallback
    cheapest      = cheapest      or fallback
    fastest       = fastest       or fallback
    highest_rated = highest_rated or fallback

    # ── Step 3: Generate explanations ────────────────────────────────────
    results = generate_explanations(results, intent)

    hero_explanation = generate_hero_explanation(best_overall, results, intent)
    best_overall["hero_explanation"] = hero_explanation

    # ── Step 4: Strip internal debug fields before sending to frontend ───
    for r in results:
        r.pop("_relevance_score", None)
        r.pop("_composite_score", None)

    return {
        "query":          request.query,
        "intent":         intent.model_dump(),
        "results":        results,
        "best_overall":   best_overall,
        "cheapest":       cheapest,
        "fastest":        fastest,
        "highest_rated":  highest_rated,
    }