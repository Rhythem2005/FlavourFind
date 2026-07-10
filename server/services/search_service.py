"""
Search service for FoodLens AI.

Orchestrates the full search pipeline:
  Query → Intent Extraction → Zomato+Swiggy Scrape → Smart Filtering → Relevance Ranking → Results

Supports both the legacy `search_food()` (for backwards compat) and the
new `search_with_intent()` that powers Phase 2/3.

Phase 3 change: `search_with_intent` now calls `rank_with_intent` from the
ranking service so results are ordered by relevance + utility before being
returned to the route layer.

Phase 2 (Swiggy): Both Zomato and Swiggy scrapers run in parallel via
ThreadPoolExecutor. Results are merged into a unified list before ranking.
"""

import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from scrapers.zomato.scraper import scrape_zomato
from scrapers.swiggy.scraper import scrape_swiggy
from services.query_understanding import extract_intent, FALLBACK_CATEGORIES
from services.ranking_service import rank_with_intent
from schemas.search_intent import SearchIntent

logger = logging.getLogger(__name__)


def _platform_counts(results: list[dict]) -> str:
    """Return a compact platform-distribution string for trace logging."""
    counts: dict[str, int] = {}
    for r in results:
        p = r.get("platform", "unknown")
        counts[p] = counts.get(p, 0) + 1
    parts = [f"{p}: {n}" for p, n in sorted(counts.items())]
    return f"total={len(results)} ({', '.join(parts)})" if parts else "total=0"


# ── Legacy search (unchanged) ─────────────────────────────────────────────────

def search_food(query: str) -> list[dict]:
    """
    Search for food using the Zomato scraper.
    Returns a list of formatted restaurant results for the ranking engine and frontend.
    """
    try:
        results = scrape_zomato(query=query, city="delhi")
    except Exception as e:
        logger.error(f"Scraper failed for '{query}': {e}")
        results = []

    if not results:
        logger.warning(f"No results found for '{query}'")
        return []

    formatted_results = []
    for item in results:
        formatted_results.append({
            "food_name": query.title(),
            "restaurant": item.get("restaurant_name"),
            "price": item.get("cost_for_two"),
            "rating": item.get("rating"),
            "delivery_time": item.get("delivery_time_minutes"),
            "platform": "Zomato",
            "cuisines": item.get("cuisines"),
            "discount": item.get("discount"),
            "thumbnail": item.get("thumbnail"),
            "restaurant_url": item.get("restaurant_url"),
        })

    logger.info(f"Returning {len(formatted_results)} results for '{query}'")
    return formatted_results


# ── Phase 2/3: intent-aware search ────────────────────────────────────────────

def search_with_intent(query: str) -> dict:
    """
    Full Phase 2/3 search pipeline.

    Returns a dict with:
      - intent:           the extracted SearchIntent (serialised)
      - results:          list of filtered + relevance-ranked restaurant dicts
      - search_term_used: what was actually sent to Zomato
    """
    # Step 1 — Extract intent via Gemini
    intent = extract_intent(query)
    logger.info(f"Intent for '{query}': {intent.model_dump_json()}")

    # Step 2 — Determine search term
    search_term = intent.food_search_term

    # Step 3 — Scrape
    if search_term:
        raw_results = _scrape_and_format(search_term, query)
    else:
        logger.info("No food term extracted — trying fallback categories")
        raw_results = _search_fallback_categories(query)

    logger.info(f"[TRACE] After scrape: {_platform_counts(raw_results)}")

    # Step 4 — Smart filtering (budget, speed, rating preference hard-filters)
    filtered = _apply_smart_filters(raw_results, intent)

    # If filtering removed everything, fall back to unfiltered (with a warning)
    if not filtered and raw_results:
        logger.warning("Smart filtering removed all results — returning unfiltered")
        filtered = raw_results

    logger.info(f"[TRACE] After smart filters: {_platform_counts(filtered)}")

    # Step 5 — Relevance-aware ranking (NEW: Phase 3)
    # This sorts by relevance to the food term FIRST, then by utility factors.
    # Burger King won't appear at the top of a biryani search anymore.
    ranked = rank_with_intent(filtered, intent)

    logger.info(f"[TRACE] After ranking: {_platform_counts(ranked)}")

    # Step 6 — Relevance cutoff (NEW)
    # Drop restaurants that scored below the minimum relevance threshold.
    # 0.40 = alias-name match minimum; anything below means no connection to the food term.
    if food_term := intent.food_search_term:
        relevant = [r for r in ranked if r.get("_relevance_score", 0) >= 0.40]
        if relevant:  # ← indented inside, safe
            ranked = relevant
            logger.info(f"Relevance cutoff: kept {len(relevant)} relevant results")

    logger.info(
        f"[TRACE] Final output: {_platform_counts(ranked)}, "
        f"top: {ranked[0].get('restaurant') if ranked else 'none'}"
    )

    return {
        "intent": intent,
        "results": ranked,
        "search_term_used": search_term or "popular",
    }


def _scrape_and_format(search_term: str, original_query: str) -> list[dict]:
    """
    Scrape Zomato and Swiggy in parallel, then merge results into
    the standard dict shape.
    """
    zomato_raw: list[dict] = []
    swiggy_raw: list[dict] = []

    # Run both scrapers in parallel — each launches its own browser
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {
            pool.submit(scrape_zomato, query=search_term, city="delhi"): "zomato",
            pool.submit(scrape_swiggy, query=search_term, city="delhi"): "swiggy",
        }
        for future in as_completed(futures):
            platform = futures[future]
            try:
                result = future.result()
                if platform == "zomato":
                    zomato_raw = result or []
                else:
                    swiggy_raw = result or []
                logger.info(f"{platform.title()} returned {len(result or [])} results")
            except Exception as e:
                logger.error(f"{platform.title()} scraper failed for '{search_term}': {e}")

    # Merge both into a single formatted list
    all_raw = zomato_raw + swiggy_raw

    if not all_raw:
        logger.warning(f"No scraper results for '{search_term}' from any platform")
        return []

    formatted = []
    for item in all_raw:
        formatted.append({
            "food_name": (search_term or original_query).title(),
            "restaurant": item.get("restaurant_name"),
            "price": item.get("cost_for_two"),
            "cost_for_one": item.get("cost_for_one"),
            "rating": item.get("rating"),
            "delivery_time": item.get("delivery_time_minutes"),
            "platform": item.get("platform", "Zomato").title(),
            "cuisines": item.get("cuisines"),
            "discount": item.get("discount"),
            "thumbnail": item.get("thumbnail"),
            "restaurant_url": item.get("restaurant_url"),
        })

    logger.info(
        f"[TRACE] _scrape_and_format: {_platform_counts(formatted)} "
        f"(raw — Zomato: {len(zomato_raw)}, Swiggy: {len(swiggy_raw)})"
    )
    return formatted


def _search_fallback_categories(original_query: str) -> list[dict]:
    """
    For vague queries ("I'm hungry", "suggest something"), search a few
    popular categories and merge results to give the user something useful.
    Limits to 3 categories to keep latency reasonable.

    Deduplicates by (name, platform) so cross-platform entries for the same
    restaurant are preserved (e.g. Pizza Hut on Zomato AND Swiggy).
    """
    import random

    categories = random.sample(FALLBACK_CATEGORIES, min(3, len(FALLBACK_CATEGORIES)))
    all_results: list[dict] = []
    seen_keys: set[tuple[str, str]] = set()

    for cat in categories:
        results = _scrape_and_format(cat, original_query)
        for r in results:
            name = r.get("restaurant")
            platform = r.get("platform", "unknown")
            key = (name, platform)
            if name and key not in seen_keys:
                seen_keys.add(key)
                all_results.append(r)

    logger.info(
        f"Fallback search across {categories} → {_platform_counts(all_results)}"
    )
    return all_results


def _apply_smart_filters(
    results: list[dict],
    intent: SearchIntent,
) -> list[dict]:
    """
    Apply intent-derived hard filters to narrow down results.

    Filters are applied softly — if a filter would remove ALL results,
    we skip it (handled by the caller's fallback logic).

    NOTE: Relevance filtering is intentionally NOT done here. We let
    rank_with_intent handle irrelevant restaurants via the relevance
    penalty score rather than removing them entirely. This preserves
    results for edge cases where Zomato returns limited data.
    """
    filtered = list(results)

    # ── Budget filter ────────────────────────────────────────────────────
    if intent.budget is not None:
        budget_per_person = intent.budget_per_person

        if intent.group_size > 1:
            budget_filtered = []
            for r in filtered:
                cost_one = r.get("cost_for_one")
                cost_two = r.get("price")  # cost_for_two

                if cost_one is not None:
                    total = cost_one * intent.group_size
                    if total <= intent.budget * 1.15:
                        budget_filtered.append(r)
                elif cost_two is not None:
                    est_total = (cost_two / 2) * intent.group_size
                    if est_total <= intent.budget * 1.15:
                        budget_filtered.append(r)
                else:
                    budget_filtered.append(r)

            if budget_filtered:
                filtered = budget_filtered
        else:
            budget_filtered = []
            for r in filtered:
                cost_one = r.get("cost_for_one")
                cost_two = r.get("price")

                if cost_one is not None:
                    if cost_one <= intent.budget * 1.15:
                        budget_filtered.append(r)
                elif cost_two is not None:
                    if cost_two <= intent.budget * 2 * 1.15:
                        budget_filtered.append(r)
                else:
                    budget_filtered.append(r)

            if budget_filtered:
                filtered = budget_filtered

    # ── Preference-based soft filters ────────────────────────────────────
    if "fast delivery" in intent.preferences:
        fast = [r for r in filtered if r.get("delivery_time") is not None and r["delivery_time"] <= 35]
        if fast:
            filtered = fast

    if "highly rated" in intent.preferences:
        rated = [r for r in filtered if r.get("rating") is not None and r["rating"] >= 3.8]
        if rated:
            filtered = rated

    if "discounts" in intent.preferences:
        with_discount = [r for r in filtered if r.get("discount")]
        if with_discount:
            filtered = with_discount

    return filtered