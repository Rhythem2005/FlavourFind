"""
Rule-based recommendation explanation engine for FoodLens AI.

Generates concise, dynamic "why recommended" bullet points for each restaurant
based on the user's intent and how the restaurant compares to the result set.

Uses pure logic (no LLM calls) for instant, deterministic explanations.
"""

import logging
from typing import Optional

from schemas.search_intent import SearchIntent

logger = logging.getLogger(__name__)


def generate_explanations(
    results: list[dict],
    intent: SearchIntent,
) -> list[dict]:
    """
    Attach a `why_recommended` list of 1-3 bullet strings to each result dict.

    Mutates and returns the same list for convenience.
    """
    if not results:
        return results

    # ── Pre-compute result-set stats for relative comparisons ────────────
    prices = [r["price"] for r in results if r.get("price") is not None]
    ratings = [r["rating"] for r in results if r.get("rating") is not None]
    times = [r["delivery_time"] for r in results if r.get("delivery_time") is not None]

    min_price = min(prices) if prices else None
    max_price = max(prices) if prices else None
    avg_price = sum(prices) / len(prices) if prices else None
    max_rating = max(ratings) if ratings else None
    min_time = min(times) if times else None

    budget_per_person = intent.budget_per_person

    for r in results:
        bullets: list[str] = []

        price = r.get("price")
        rating = r.get("rating")
        delivery = r.get("delivery_time")
        discount = r.get("discount")

       
        if budget_per_person is not None and price is not None:
            cost_per_person = price  
            if intent.group_size > 1:
                
                total_cost = price  
                if total_cost <= intent.budget:
                    savings = intent.budget - total_cost
                    if savings > 0:
                        bullets.append(f"Fits your ₹{intent.budget} budget (₹{savings} to spare)")
                    else:
                        bullets.append(f"Within your ₹{intent.budget} budget")
            else:
                if price <= intent.budget:
                    bullets.append(f"Fits your ₹{intent.budget} budget (₹{price} for two)")

        if rating is not None and max_rating is not None:
            if rating == max_rating and len(ratings) > 1:
                bullets.append(f"Highest rated at {rating}★ among all results")
            elif rating >= 4.3:
                percentile = sum(1 for x in ratings if x <= rating) / len(ratings) * 100
                bullets.append(f"Rated {rating}★ — top {max(1, int(100 - percentile))}% of results")
            elif rating >= 4.0:
                bullets.append(f"Well rated at {rating}★")

        if delivery is not None and min_time is not None:
            if delivery == min_time and len(times) > 1:
                bullets.append(f"Fastest delivery at {delivery} min")
            elif delivery <= 25:
                bullets.append(f"Quick delivery in {delivery} min")

        if discount:
            bullets.append(f"Active offer: {discount}")

        if price is not None and avg_price is not None and len(bullets) < 3:
            if price == min_price and len(prices) > 1:
                bullets.append(f"Cheapest option at ₹{price} for two")
            elif price < avg_price * 0.85:
                pct_below = int(((avg_price - price) / avg_price) * 100)
                bullets.append(f"{pct_below}% below average price")

       
        if not bullets:
            if r.get("cuisines"):
                bullets.append(f"Serves {r['cuisines']}")
            else:
                bullets.append("Matches your search")

       
        r["why_recommended"] = bullets[:3]

    return results


def generate_hero_explanation(
    item: dict,
    results: list[dict],
    intent: SearchIntent,
) -> list[str]:
    """
    Generate a richer explanation (up to 4 bullets) for the AI Top Pick / hero card.

    This is separate from per-card explanations because the hero gets more space.
    """
    if not item:
        return []

    bullets: list[str] = []

    price = item.get("price")
    rating = item.get("rating")
    delivery = item.get("delivery_time")
    discount = item.get("discount")
    cuisines = item.get("cuisines")

    prices = [r["price"] for r in results if r.get("price") is not None]
    ratings = [r["rating"] for r in results if r.get("rating") is not None]

    # Budget fit
    if intent.budget is not None and price is not None:
        if intent.group_size > 1:
            if price <= intent.budget:
                bullets.append(
                    f"Fits your ₹{intent.budget} budget for {intent.group_size} people"
                )
        else:
            if price <= intent.budget:
                bullets.append(f"₹{price} for two — within your ₹{intent.budget} budget")

    # Rating
    if rating is not None:
        if ratings:
            rank = sorted(ratings, reverse=True).index(rating) + 1
            bullets.append(f"Rated {rating}★ — #{rank} out of {len(ratings)} restaurants")
        else:
            bullets.append(f"Rated {rating}★")

    # Delivery
    if delivery is not None and delivery <= 30:
        bullets.append(f"Delivers in just {delivery} minutes")

    # Discount
    if discount:
        bullets.append(f"Active offer: {discount}")

    # Price comparison
    if price is not None and prices:
        avg = sum(prices) / len(prices)
        if price < avg:
            pct = int(((avg - price) / avg) * 100)
            if pct > 5:
                search_term = intent.food_search_term or "this search"
                bullets.append(f"{pct}% below average price for \"{search_term}\"")

    # Cuisine
    if cuisines and len(bullets) < 4:
        bullets.append(f"Cuisine: {cuisines}")

    return bullets[:4]
