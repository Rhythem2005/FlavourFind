import logging

from fastapi import APIRouter

from schemas.search import SearchRequest
from services.search_service import search_food

from services.ranking_service import (
    get_best_overall_option,
    get_cheapest_option,
    get_fastest_option,
    get_highest_rated_option,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search")
def search(request: SearchRequest):
    """
    Search for food and return ranked results.
    
    Returns all results plus category winners (best overall, cheapest,
    fastest delivery, highest rated). Falls back to first result if
    a category winner can't be determined.
    """
    results = search_food(request.query)

    if not results:
        return {
            "query": request.query,
            "results": [],
            "best_overall": None,
            "cheapest": None,
            "fastest": None,
            "highest_rated": None,
        }

    best_overall = get_best_overall_option(results)
    cheapest = get_cheapest_option(results)
    fastest = get_fastest_option(results)
    highest_rated = get_highest_rated_option(results)

    # Fallback to first result if ranking returns None
    # (prevents frontend crash when accessing recommendation fields)
    fallback = results[0]

    return {
        "query": request.query,
        "results": results,
        "best_overall": best_overall or fallback,
        "cheapest": cheapest or fallback,
        "fastest": fastest or fallback,
        "highest_rated": highest_rated or fallback,
    }