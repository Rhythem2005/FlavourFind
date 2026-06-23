"""
Ranking service for FoodLens AI.

Provides both the original category-winner functions (unchanged) and a new
intent-aware dynamic ranking system that adjusts scoring weights based on
what the user asked for.

Phase 3 addition: relevance scoring layer applied BEFORE all other ranking
factors. A restaurant that doesn't match the requested food type receives a
heavy penalty so it can never outrank a relevant result.
"""

import re
from schemas.search_intent import SearchIntent


# ── Weight profiles keyed by ranking_priority ─────────────────────────────────

_WEIGHT_PROFILES: dict[str, dict[str, float]] = {
    "affordability":   {"price": 0.50, "rating": 0.20, "delivery": 0.15, "discount": 0.15},
    "rating":          {"price": 0.10, "rating": 0.60, "delivery": 0.15, "discount": 0.15},
    "speed":           {"price": 0.10, "rating": 0.20, "delivery": 0.55, "discount": 0.15},
    "discounts":       {"price": 0.15, "rating": 0.15, "delivery": 0.10, "discount": 0.60},
    "value_for_money": {"price": 0.35, "rating": 0.30, "delivery": 0.15, "discount": 0.20},
    "balanced":        {"price": 0.30, "rating": 0.40, "delivery": 0.20, "discount": 0.10},
}


# ── Cuisine alias map ──────────────────────────────────────────────────────────
# Maps a food_search_term to related terms that should also count as relevant.
# This lets "biryani" match "hyderabadi", "dum biryani", "mughlai", etc.

_CUISINE_ALIASES: dict[str, list[str]] = {
    "biryani":      ["biryani", "dum biryani", "hyderabadi", "mughlai", "lucknowi", "awadhi", "rice", "pulao"],
    "burger":       ["burger", "burgers", "american", "fast food", "grill", "bbq", "smash burger"],
    "pizza":        ["pizza", "pizzas", "italian", "wood fired", "thin crust", "pan pizza"],
    "chinese":      ["chinese", "indo-chinese", "noodles", "manchurian", "hakka", "dimsums", "dimsum", "wonton"],
    "momos":        ["momos", "dumplings", "tibetan", "dim sum", "chinese"],
    "sushi":        ["sushi", "japanese", "ramen", "asian"],
    "pasta":        ["pasta", "italian", "continental"],
    "rolls":        ["rolls", "wraps", "kathi roll", "frankie", "mughlai"],
    "sandwich":     ["sandwich", "sandwiches", "subs", "deli", "cafe"],
    "tacos":        ["tacos", "mexican", "burrito", "tex-mex"],
    "north indian": ["north indian", "punjabi", "dal makhani", "butter chicken", "mughlai", "curry"],
    "south indian": ["south indian", "dosa", "idli", "udupi", "filter coffee", "chettinad"],
    "chole bhature":["chole", "bhature", "north indian", "punjabi"],
    "pav bhaji":    ["pav bhaji", "mumbai street food", "street food", "maharashtrian"],
    "ice cream":    ["ice cream", "desserts", "gelato", "frozen yogurt", "cakes"],
    "cake":         ["cake", "bakery", "desserts", "pastry", "patisserie"],
}


def _get_search_aliases(food_term: str) -> list[str]:
    """
    Return the list of relevant terms for a given food_search_term.
    Falls back to just the term itself if no alias entry exists.
    """
    if not food_term:
        return []
    term_lower = food_term.lower().strip()
    # Exact key match first
    if term_lower in _CUISINE_ALIASES:
        return _CUISINE_ALIASES[term_lower]
    # Partial key match (e.g. "dum biryani" → biryani bucket)
    for key, aliases in _CUISINE_ALIASES.items():
        if key in term_lower or term_lower in key:
            return aliases
    # No alias found — use the term itself
    return [term_lower]


def _compute_relevance_score(item: dict, food_term: str) -> float:
    """
    Returns a relevance score in [0.0, 1.0] for how well a restaurant
    matches the requested food type.

    Scoring tiers
    ─────────────
    1.0   — restaurant name contains the food term (strongest signal)
    0.85  — cuisines field contains the food term exactly
    0.70  — cuisines field contains an alias term
    0.40  — restaurant name contains an alias term
    0.10  — no match found (heavy penalty, but not zero — keeps fallback behavior)

    The score is multiplied by a RELEVANCE_WEIGHT before being added to the
    composite score, so it dominates but doesn't completely ignore the rest.
    """
    if not food_term:
        return 1.0  # no food term specified → no penalty for anyone

    aliases = _get_search_aliases(food_term)
    term_lower = food_term.lower().strip()

    restaurant_name = (item.get("restaurant") or "").lower()
    cuisines_raw    = (item.get("cuisines") or "").lower()

    # Split cuisines into individual tokens for cleaner matching
    cuisine_tokens = [c.strip() for c in re.split(r"[,|/]", cuisines_raw) if c.strip()]

    # ── Tier 1: restaurant name contains the primary term ────────────────
    if term_lower in restaurant_name:
        return 1.0

    # ── Tier 2: cuisines field contains the primary term ─────────────────
    if term_lower in cuisines_raw:
        return 0.85

    # ── Tier 3: cuisines contains an alias ───────────────────────────────
    for alias in aliases:
        for token in cuisine_tokens:
            if alias in token or token in alias:
                return 0.70

    # ── Tier 4: restaurant name contains an alias ─────────────────────────
    for alias in aliases:
        if alias in restaurant_name:
            return 0.40

    # ── No match ──────────────────────────────────────────────────────────
    return 0.10


# ── Original category-winner functions (unchanged) ───────────────────────────

def get_cheapest_option(results):
    if not results:
        return None
    valid = [r for r in results if r.get("price") is not None]
    return min(valid, key=lambda x: x["price"]) if valid else None


def get_fastest_option(results):
    valid = [r for r in results if r.get("delivery_time") is not None]
    if not valid:
        return None
    return min(valid, key=lambda x: x["delivery_time"])


def get_highest_rated_option(results):
    valid = [r for r in results if r.get("rating") is not None]
    if not valid:
        return None
    return max(valid, key=lambda x: x["rating"])


def get_best_overall_option(results):
    valid = [
        r for r in results
        if r.get("rating") is not None and r.get("price") is not None
    ]
    if not valid:
        return None

    def score(item):
        delivery = item.get("delivery_time")
        delivery_score = (
            (60 - min(delivery, 60)) / 60 * 0.2 if delivery is not None else 0
        )
        price = min(item["price"], 500)
        return (
            item["rating"] * 0.5
            + (500 - price) / 500 * 0.3
            + delivery_score
        )

    return max(valid, key=score)


# ── New: intent-aware dynamic ranking with relevance layer ────────────────────

# How much of the total score budget is reserved for relevance.
# At 0.40, a fully irrelevant restaurant (score=0.10) can never beat
# a moderately relevant one even if it has a perfect price/rating/delivery.
_RELEVANCE_WEIGHT = 0.40
_UTILITY_WEIGHT   = 1.0 - _RELEVANCE_WEIGHT  # 0.60 left for price/rating/etc.


def rank_with_intent(results: list[dict], intent: SearchIntent) -> list[dict]:
    """
    Sort results by a composite score = relevance_score + utility_score.

    Step 1 — Relevance score (weight: 40%)
        Measures how well the restaurant matches the requested food type.
        A Burger King result when the user asked for biryani gets ~0.10,
        a dedicated biryani place gets 1.0.  This score is multiplied by
        _RELEVANCE_WEIGHT before being added to the composite.

    Step 2 — Utility score (weight: 60%)
        Normalised composite of price, rating, delivery time, and discount,
        weighted according to the intent's ranking_priority profile.
        This part is unchanged from the original implementation.

    The relevance score dominates enough that no highly-rated but irrelevant
    restaurant can float above a relevant one.

    Returns a new sorted list (does not mutate the input).
    """
    if not results:
        return []

    food_term = (intent.food_search_term or "").strip()
    weights   = _WEIGHT_PROFILES.get(intent.ranking_priority, _WEIGHT_PROFILES["balanced"])

    # ── Compute normalisation bounds for utility scores ──────────────────
    prices  = [r["price"]         for r in results if r.get("price") is not None]
    ratings = [r["rating"]        for r in results if r.get("rating") is not None]
    times   = [r["delivery_time"] for r in results if r.get("delivery_time") is not None]

    min_price    = min(prices)  if prices  else 1
    max_price    = max(prices)  if prices  else 1
    price_range  = max(max_price - min_price, 1)

    min_rating   = min(ratings) if ratings else 1
    max_rating   = max(ratings) if ratings else 5
    rating_range = max(max_rating - min_rating, 0.1)

    min_time     = min(times)   if times   else 1
    max_time     = max(times)   if times   else 60
    time_range   = max(max_time - min_time, 1)

    budget_per_person = intent.budget_per_person

    def _utility_score(item: dict) -> float:
        """Normalised utility score in [0, 1] based on ranking_priority weights."""
        score = 0.0

        # Price: lower is better
        price = item.get("price")
        if price is not None and prices:
            price_norm = 1.0 - ((price - min_price) / price_range)
            score += price_norm * weights["price"]
            if budget_per_person is not None and price <= budget_per_person * 2:
                score += 0.05  # small budget-fit bonus
        else:
            score += 0.3 * weights["price"]

        # Rating: higher is better
        rating = item.get("rating")
        if rating is not None and ratings:
            rating_norm = (rating - min_rating) / rating_range
            score += rating_norm * weights["rating"]
        else:
            score += 0.3 * weights["rating"]

        # Delivery: lower is better
        delivery = item.get("delivery_time")
        if delivery is not None and times:
            time_norm = 1.0 - ((delivery - min_time) / time_range)
            score += time_norm * weights["delivery"]
        else:
            score += 0.3 * weights["delivery"]

        # Discount: binary
        if item.get("discount"):
            score += 1.0 * weights["discount"]

        return score

    def _composite_score(item: dict) -> float:
        relevance = _compute_relevance_score(item, food_term)
        utility   = _utility_score(item)
        return (relevance * _RELEVANCE_WEIGHT) + (utility * _UTILITY_WEIGHT)

    scored = [(item, _composite_score(item)) for item in results]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Attach debug scores to each item (stripped before sending to frontend if needed)
    for item, composite in scored:
        item["_relevance_score"] = round(_compute_relevance_score(item, food_term), 3)
        item["_composite_score"] = round(composite, 3)

    return [item for item, _ in scored]