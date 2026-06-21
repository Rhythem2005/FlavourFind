# server/scrapers/zomato/scraper.py
# Zomato restaurant scraper using Playwright API interception.
# Intercepts webroutes/search/home responses to extract structured restaurant data.

import logging
import time
import random

from playwright.sync_api import sync_playwright, Response

logger = logging.getLogger(__name__)

# ── City slug mapping ─────────────────────────────────────────────────────────
CITY_SLUGS = {
    "delhi": "ncr",
    "mumbai": "mumbai",
    "bangalore": "bangalore",
    "hyderabad": "hyderabad",
    "chennai": "chennai",
    "kolkata": "kolkata",
    "pune": "pune",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _random_delay(min_ms: int = 1500, max_ms: int = 3500) -> None:
    """Human-like delay between actions."""
    time.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


def _get_city_slug(city: str) -> str:
    return CITY_SLUGS.get(city.lower(), city.lower())


def _clean_int(text: str) -> int | None:
    """Extract first integer from a string like '₹400 for two' → 400 or '33 min' → 33."""
    digits = "".join(filter(str.isdigit, str(text)))
    return int(digits) if digits else None


def _clean_float(text: str) -> float | None:
    """Extract a rating float (1.0-5.0) from a string like '4.1'."""
    try:
        token = str(text).strip().split()[0]
        val = float(token)
        return val if 1.0 <= val <= 5.0 else None
    except (ValueError, IndexError):
        return None


# ── API Response Parser ───────────────────────────────────────────────────────

def _parse_api_response(data: dict) -> list[dict]:
    """
    Extract restaurants from a webroutes/search/home JSON response.

    Structure: data.sections.SECTION_SEARCH_RESULT → list of restaurant items.
    Each item has: item.type, item.info, item.order, item.cardAction, item.bulkOffers
    """
    restaurants = []

    try:
        sections = data.get("sections", {})
        search_results = sections.get("SECTION_SEARCH_RESULT", [])

        if not search_results:
            logger.warning("SECTION_SEARCH_RESULT is empty or missing")
            return []

        logger.info(f"Found {len(search_results)} items in SECTION_SEARCH_RESULT")

        for item in search_results:
            if item.get("type") != "restaurant":
                continue

            info = item.get("info", {})
            if not info:
                continue

            restaurant = _build_restaurant(info, item)
            if restaurant:
                restaurants.append(restaurant)

    except Exception as e:
        logger.error(f"parse_api_response error: {e}")

    return restaurants


def _build_restaurant(info: dict, parent: dict | None = None) -> dict | None:
    """
    Build a canonical restaurant dict from API data.

    Field paths (confirmed from captured API responses):
      info.resId                       → restaurant_id
      info.name                        → restaurant_name
      info.rating.aggregate_rating     → rating ("4.1")
      info.cft.text                    → "₹400 for two"
      info.cfo.text                    → "₹200 for one"
      info.cuisine[].name              → ["Pizza", "Fast Food"]
      info.image.url                   → thumbnail
      info.locality.name               → area
      parent.order.deliveryTime        → "33 min"
      parent.cardAction.clickUrl       → "/ncr/restaurant-name/order"
      parent.bulkOffers[0].text        → "₹100 OFF"
    """
    try:
        # ── Name (required) ───────────────────────────────────────
        name = info.get("name", "").strip()
        if not name:
            return None

        # ── Restaurant ID ─────────────────────────────────────────
        res_id = info.get("resId") or info.get("id")

        # ── Rating ────────────────────────────────────────────────
        rating = None
        rating_block = info.get("rating", {})
        if isinstance(rating_block, dict):
            raw = rating_block.get("aggregate_rating", "")
            rating = _clean_float(str(raw))

        # Fallback: ratingNew.ratings.DELIVERY.ratingV2
        if rating is None:
            try:
                raw = (
                    info.get("ratingNew", {})
                        .get("ratings", {})
                        .get("DELIVERY", {})
                        .get("ratingV2", "")
                )
                rating = _clean_float(str(raw))
            except Exception:
                pass

        # ── Cost ──────────────────────────────────────────────────
        cost_for_one = _clean_int(info.get("cfo", {}).get("text", ""))
        cost_for_two = _clean_int(info.get("cft", {}).get("text", ""))

        # ── Cuisines ──────────────────────────────────────────────
        cuisines = None
        cuisine_list = info.get("cuisine", [])
        if isinstance(cuisine_list, list) and cuisine_list:
            cuisines = ", ".join(
                c.get("name", "") for c in cuisine_list if c.get("name")
            )

        # ── Thumbnail ─────────────────────────────────────────────
        thumbnail = (
            info.get("image", {}).get("url")
            or info.get("o2FeaturedImage", {}).get("url")
        )

        # ── Area / Locality ───────────────────────────────────────
        area = info.get("locality", {}).get("name")

        # ── Delivery time ─────────────────────────────────────────
        # Located at parent.order.deliveryTime = "33 min"
        delivery_time = None
        if parent:
            order_block = parent.get("order", {})
            raw_delivery = order_block.get("deliveryTime", "")
            if raw_delivery:
                delivery_time = _clean_int(str(raw_delivery))

        # ── Restaurant URL ────────────────────────────────────────
        # Located at parent.cardAction.clickUrl = "/ncr/restaurant-name/order?..."
        restaurant_url = None
        if parent:
            card_url = parent.get("cardAction", {}).get("clickUrl", "")
            if card_url:
                # Strip query params for a cleaner URL
                clean_path = card_url.split("?")[0]
                restaurant_url = f"https://www.zomato.com{clean_path}"

        # ── Discount / Offer ──────────────────────────────────────
        # Located at parent.bulkOffers[0].text = "₹100 OFF"
        discount = None
        if parent:
            bulk = parent.get("bulkOffers", [])
            if isinstance(bulk, list) and bulk:
                discount = bulk[0].get("text")

        return {
            "platform": "zomato",
            "restaurant_id": str(res_id) if res_id else None,
            "restaurant_name": name,
            "rating": rating,
            "cost_for_one": cost_for_one,
            "cost_for_two": cost_for_two,
            "delivery_time_minutes": delivery_time,
            "cuisines": cuisines,
            "discount": discount,
            "thumbnail": thumbnail,
            "area": area,
            "restaurant_url": restaurant_url,
        }

    except Exception as e:
        logger.error(f"build_restaurant error for '{info.get('name', '?')}': {e}")
        return None


# ── Main Scraper ──────────────────────────────────────────────────────────────

def scrape_zomato(query: str, city: str = "delhi") -> list[dict]:
    """
    Scrape Zomato for restaurants matching a food query.

    Uses Playwright to load Zomato's delivery page and intercept the
    webroutes/search/home API response containing structured restaurant data.

    Returns a deduplicated list of restaurant dicts.
    """
    city_slug = _get_city_slug(city)
    api_responses: list[dict] = []

    query_slug = query.strip().lower().replace(" ", "-")

    urls_to_try = [
        f"https://www.zomato.com/{city_slug}/delivery/dish-{query_slug}",
        f"https://www.zomato.com/{city_slug}/order-{query_slug}-online",
        f"https://www.zomato.com/{city_slug}/delivery?q={query}",
    ]

    def handle_response(response: Response) -> None:
        """Intercept JSON API responses from Zomato."""
        url = response.url

        if "zomato.com" not in url:
            return

        # Skip static assets and analytics
        skip = [".png", ".jpg", ".svg", ".js", ".css", ".woff", ".ico",
                "analytics", "sentry", "clarity", "facebook", "google",
                "hotjar", "segment", "mixpanel", "amplitude"]
        if any(k in url.lower() for k in skip):
            return

        content_type = response.headers.get("content-type", "")
        if "json" not in content_type:
            return

        try:
            body = response.json()
            if not isinstance(body, dict) or len(str(body)) < 300:
                return

            logger.debug(f"Intercepted API: {url[:90]}")
            api_responses.append(body)
        except Exception:
            pass

    try:
        with sync_playwright() as p:
            logger.info(f"Scraping: query='{query}', city={city} → {city_slug}")

            browser = p.chromium.launch(
                headless=False,
                args=[
                    "--no-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-http2",
                    "--disable-dev-shm-usage",
                ],
            )

            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-IN",
                timezone_id="Asia/Kolkata",
            )

            page = context.new_page()
            page.on("response", handle_response)

            # Try each URL pattern until one loads successfully
            success = False
            for url in urls_to_try:
                logger.info(f"Trying: {url}")
                try:
                    resp = page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    status = resp.status if resp else 0
                    if status == 200:
                        logger.info(f"Loaded: {url}")
                        success = True
                        break
                    else:
                        logger.warning(f"HTTP {status} for {url}")
                        _random_delay(1000, 2000)
                except Exception as e:
                    logger.warning(f"Failed to load {url}: {e}")
                    continue

            if not success:
                logger.error("All URL patterns failed")
                browser.close()
                return []

            # Scroll to trigger lazy-loaded content and API calls
            _random_delay(2000, 3000)
            for i in range(5):
                page.mouse.wheel(0, 700)
                _random_delay(800, 1500)

            _random_delay(2000, 3000)
            browser.close()
            logger.info("Browser closed")

    except Exception as e:
        logger.error(f"Playwright error: {e}")
        return []

    # Parse all intercepted API responses and deduplicate
    logger.info(f"Parsing {len(api_responses)} intercepted API responses")
    collected: list[dict] = []
    seen_ids: set[str] = set()
    seen_names: set[str] = set()

    for response_data in api_responses:
        parsed = _parse_api_response(response_data)
        for r in parsed:
            # Deduplicate by restaurant_id first, then by name
            rid = r.get("restaurant_id")
            name = r["restaurant_name"]

            if rid and rid in seen_ids:
                continue
            if name in seen_names:
                continue

            if rid:
                seen_ids.add(rid)
            seen_names.add(name)
            collected.append(r)

    logger.info(f"Total: {len(collected)} unique restaurants")
    return collected


# ── Entry Point (for standalone testing) ──────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    results = scrape_zomato(query="pizza", city="delhi")

    print(f"\n{'='*60}")
    print(f"RESULTS: {len(results)} restaurants")
    print(f"{'='*60}")

    for i, r in enumerate(results, 1):
        print(f"\n[{i}] {r['restaurant_name']}")
        print(f"    ID       : {r['restaurant_id']}")
        print(f"    Rating   : {r['rating']}")
        print(f"    Cost/One : ₹{r['cost_for_one']}")
        print(f"    Cost/Two : ₹{r['cost_for_two']}")
        print(f"    Delivery : {r['delivery_time_minutes']} min")
        print(f"    Cuisines : {r['cuisines']}")
        print(f"    Discount : {r['discount']}")
        print(f"    Thumbnail: {r['thumbnail'][:60] if r['thumbnail'] else None}...")
        print(f"    URL      : {r['restaurant_url']}")