"""
Gemini-powered natural language query understanding for FoodLens AI.

Phase 3: Expanded system prompt with cuisine alias awareness so that
"dum biryani", "hyderabadi", "wood fired pizza" etc. are correctly
extracted as food_search_term rather than returning null.
"""

import json
import logging
import os

from google import genai

from schemas.search_intent import SearchIntent

logger = logging.getLogger(__name__)

# ── Gemini system prompt ──────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an intent extraction engine for FoodLens AI, a restaurant comparison platform.

Your job is ONLY to extract structured restaurant search intent from a user's natural language query.

Extract the following fields:

1. food_search_term  — The food type, cuisine, or dish category the user wants.
   - If the user mentions a specific food or cuisine, extract its CANONICAL form.
   - Use the canonical food name, not the descriptive modifier.
     Examples:
       "dum biryani" → "biryani"
       "hyderabadi biryani" → "biryani"
       "wood fired pizza" → "pizza"
       "double smash burger" → "burger"
       "spicy chinese" → "chinese"
       "veg momos" → "momos"
       "butter chicken" → "north indian"
       "dal makhani" → "north indian"
       "masala dosa" → "south indian"
       "paneer rolls" → "rolls"
       "chicken shawarma" → "rolls"
   - Canonical food terms: biryani, pizza, burger, chinese, momos, sushi, pasta,
     rolls, sandwich, tacos, north indian, south indian, chole bhature, pav bhaji,
     ice cream, cake, thali, kebab, noodles, coffee, desserts.
   - If the user says something vague like "food", "dinner", "lunch",
     "something good", "I'm hungry", set this to null.
   - Do NOT invent food types. Only extract what the user explicitly mentions.

2. budget  — The maximum total budget in Indian Rupees (₹).
   - Extract the number only. "under 300" → 300. "₹1000" → 1000.
   - This is the TOTAL budget for the entire group, not per person.
   - If no budget is mentioned, set to null.

3. group_size  — How many people are eating.
   - "for 4 people" → 4. "for two" → 2. "dinner for 6" → 6.
   - Default to 1 if not mentioned.

4. preferences  — A list of additional preferences. Examples:
   - "discounts", "offers", "deals" → ["discounts"]
   - "fast", "quick", "hurry" → ["fast delivery"]
   - "best", "top", "highest rated" → ["highly rated"]
   - "late night" → ["late night"]
   - "healthy", "diet" → ["healthy"]
   - "vegetarian", "veg" → ["vegetarian"]
   - "non-veg" → ["non-vegetarian"]
   - "office lunch", "work" → ["office lunch"]
   - If none, return an empty list [].

5. ranking_priority  — The primary ranking axis. Choose ONE of:
   - "affordability"   — user emphasizes cheapness, budget, saving money
   - "rating"          — user emphasizes best, top-rated, highest quality
   - "speed"           — user emphasizes fast delivery, quick, hurry
   - "discounts"       — user emphasizes offers, deals, cashback
   - "value_for_money" — user wants a balance of price and quality
   - "balanced"        — default when no strong signal

Return ONLY a valid JSON object with these 5 keys. No explanations, no markdown, no extra text.
"""

# ── Fallback categories for vague queries ─────────────────────────────────────

FALLBACK_CATEGORIES = [
    "biryani", "pizza", "burger", "chinese",
    "north indian", "south indian", "rolls", "momos",
]


def _build_client() -> genai.Client | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — query understanding will use raw fallback")
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to create Gemini client: {e}")
        return None


def _parse_gemini_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    start = cleaned.find("{")
    end   = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            pass
    logger.warning(f"Could not parse Gemini response as JSON: {cleaned[:200]}")
    return {}


def extract_intent(query: str) -> SearchIntent:
    if not query or not query.strip():
        return SearchIntent()

    client = _build_client()
    if client is None:
        logger.info("No Gemini client — falling back to raw query as search term")
        return SearchIntent(food_search_term=query.strip())

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=query.strip(),
            config=genai.types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.1,
                max_output_tokens=256,
            ),
        )

        raw_text = response.text or ""
        parsed   = _parse_gemini_response(raw_text)

        if not parsed:
            logger.warning("Gemini returned empty/unparseable response — using raw fallback")
            return SearchIntent(food_search_term=query.strip())

        intent = SearchIntent(
            food_search_term=parsed.get("food_search_term"),
            budget=_safe_int(parsed.get("budget")),
            group_size=_safe_int(parsed.get("group_size")) or 1,
            preferences=parsed.get("preferences") if isinstance(parsed.get("preferences"), list) else [],
            ranking_priority=parsed.get("ranking_priority", "balanced"),
        )

        logger.info(f"Extracted intent: {intent.model_dump_json()}")
        return intent

    except Exception as e:
        logger.error(f"Gemini intent extraction failed: {e}")
        return SearchIntent(food_search_term=query.strip())


def _safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None