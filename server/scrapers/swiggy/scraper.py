# server/scrapers/swiggy/scraper.py
# Swiggy restaurant scraper using Playwright API interception.
# Intercepts dapi/restaurants and search API responses to extract structured restaurant data.
# Mirrors the Zomato scraper pattern for consistency.

import logging
import time
import random
import re

from playwright.sync_api import sync_playwright, Response

logger = logging.getLogger(__name__)

# ── City coordinate mapping (Swiggy uses lat/lng, not slugs) ──────────────────
CITY_COORDS = {
    "delhi":     {"lat": 28.6139, "lng": 77.2090},
    "mumbai":    {"lat": 19.0760, "lng": 72.8777},
    "bangalore": {"lat": 12.9716, "lng": 77.5946},
    "hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "chennai":   {"lat": 13.0827, "lng": 80.2707},
    "kolkata":   {"lat": 22.5726, "lng": 88.3639},
    "pune":      {"lat": 18.5204, "lng": 73.8567},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _random_delay(min_ms: int = 1500, max_ms: int = 3500) -> None:
    """Human-like delay between actions."""
    time.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


def _get_city_coords(city: str) -> dict:
    return CITY_COORDS.get(city.lower(), CITY_COORDS["delhi"])


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


# ── API Response Parsers ──────────────────────────────────────────────────────

def _extract_restaurants_from_cards(cards: list) -> list[dict]:
    """
    Parse restaurant cards from Swiggy API responses.

    Swiggy uses various card types. The relevant ones contain restaurant info
    nested under different paths depending on the API endpoint.
    """
    restaurants = []

    for card in cards:
        try:
            # Navigate nested card structures
            # Pattern 1: card.card.card.info (search results)
            # Pattern 2: card.card.info (listing pages)
            # Pattern 3: card.info (direct)
            info = None

            # Try various nesting patterns
            if isinstance(card, dict):
                # Deep nested: card → card → card → info
                inner = card.get("card", card)
                if isinstance(inner, dict):
                    inner2 = inner.get("card", inner)
                    if isinstance(inner2, dict):
                        info = inner2.get("info")
                        if info is None:
                            # Sometimes restaurant data is at inner2 level directly
                            inner3 = inner2.get("card", inner2)
                            if isinstance(inner3, dict):
                                info = inner3.get("info")

                # Direct info
                if info is None:
                    info = card.get("info")

            if not info or not isinstance(info, dict):
                continue

            # Must have a restaurant name
            name = info.get("name", "").strip()
            if not name:
                continue

            # Must look like a restaurant (has id or avgRating or costForTwo)
            if not any(info.get(k) for k in ["id", "avgRating", "costForTwo", "sla"]):
                continue

            restaurant = _build_restaurant(info)
            if restaurant:
                restaurants.append(restaurant)

        except Exception as e:
            logger.debug(f"Card parse error: {e}")
            continue

    return restaurants


def _parse_api_response(data: dict) -> list[dict]:
    """
    Extract restaurants from a Swiggy API JSON response.

    Swiggy API responses have varying structures depending on the endpoint:
    - Search: data.cards[].groupedCard.cardGroupMap.RESTAURANT.cards[]
    - Search v2: data.cards[].card.card.restaurants[]
    - Listing: data.cards[].card.card.gridElements.infoWithStyle.restaurants[]
    - Direct: data.data.cards[].card.card.info

    This parser tries all known patterns to maximize extraction.
    """
    restaurants = []

    try:
        # ── Pattern 1: Search groupedCard structure ──────────────────
        cards = data.get("data", data).get("cards", [])
        if not cards and isinstance(data.get("data"), dict):
            cards = data["data"].get("cards", [])

        for card in cards:
            # Grouped card (search results page)
            grouped = (card.get("groupedCard") or
                       card.get("card", {}).get("card", {}).get("groupedCard"))
            if grouped:
                card_group_map = grouped.get("cardGroupMap", {})
                rest_group = card_group_map.get("RESTAURANT", {})
                rest_cards = rest_group.get("cards", [])
                if rest_cards:
                    restaurants.extend(_extract_restaurants_from_cards(rest_cards))

                # ── DISH cards: Swiggy search returns dishes with embedded
                # restaurant info at card.card.restaurant.info ─────────────
                dish_group = card_group_map.get("DISH", {})
                dish_cards = dish_group.get("cards", [])
                if dish_cards:
                    logger.info(f"Found {len(dish_cards)} DISH cards — extracting restaurants")
                    seen_dish_rest: set[str] = set()
                    for dc in dish_cards:
                        try:
                            dc_inner = dc.get("card", {}).get("card", {})
                            rest_info = dc_inner.get("restaurant", {}).get("info", {})
                            if not rest_info or not rest_info.get("name"):
                                continue
                            rid = str(rest_info.get("id", ""))
                            if rid and rid in seen_dish_rest:
                                continue
                            if rid:
                                seen_dish_rest.add(rid)
                            r = _build_restaurant(rest_info)
                            if r:
                                restaurants.append(r)
                        except Exception as e:
                            logger.debug(f"DISH card parse error: {e}")
                            continue

            # Grid elements (listing pages / collection pages)
            inner_card = card.get("card", {}).get("card", {})
            grid = inner_card.get("gridElements", {})
            info_with_style = grid.get("infoWithStyle", {})
            grid_restaurants = info_with_style.get("restaurants", [])
            if grid_restaurants:
                restaurants.extend(_extract_restaurants_from_cards(grid_restaurants))

            # Direct restaurant list in card
            direct_restaurants = inner_card.get("restaurants", [])
            if direct_restaurants:
                restaurants.extend(_extract_restaurants_from_cards(direct_restaurants))

            # Single restaurant info in card
            info = inner_card.get("info")
            if info and isinstance(info, dict) and info.get("name"):
                r = _build_restaurant(info)
                if r:
                    restaurants.append(r)

        # ── Pattern 2: Direct data.restaurants ───────────────────────
        direct_list = data.get("data", data).get("restaurants", [])
        if direct_list:
            restaurants.extend(_extract_restaurants_from_cards(direct_list))

        # ── Pattern 3: statusMessage contains restaurant list ────────
        if not restaurants:
            # Some endpoints return data under data.statusMessage
            status_data = data.get("data", {})
            if isinstance(status_data, dict):
                for key in ["cards", "RESTAURANT", "restaurants"]:
                    nested = status_data.get(key, [])
                    if isinstance(nested, list) and nested:
                        restaurants.extend(_extract_restaurants_from_cards(nested))

    except Exception as e:
        logger.error(f"parse_api_response error: {e}")

    if restaurants:
        logger.info(f"Parsed {len(restaurants)} restaurants from Swiggy API response")

    return restaurants


def _build_restaurant(info: dict) -> dict | None:
    """
    Build a canonical restaurant dict from Swiggy API data.

    Known field paths (from Swiggy API responses):
      info.id                              → restaurant_id
      info.name                            → restaurant_name
      info.avgRating / info.avgRatingString → rating
      info.costForTwo                       → "₹400 for two" → cost_for_two
      info.costForTwoMessage                → "₹400 for two"
      info.cuisines                         → ["Pizza", "Italian"] (list of strings)
      info.cloudinaryImageId                → thumbnail (needs CDN prefix)
      info.areaName / info.locality         → area
      info.sla.deliveryTime                 → delivery time in minutes
      info.sla.slaString                    → "26-31 min"
      info.aggregatedDiscountInfoV3.header  → "60% OFF"
      info.aggregatedDiscountInfoV3.subHeader → "UPTO ₹120"
      info.cta.link                         → restaurant URL path
    """
    try:
        # ── Name (required) ───────────────────────────────────────
        name = info.get("name", "").strip()
        if not name:
            return None

        # ── Restaurant ID ─────────────────────────────────────────
        res_id = info.get("id") or info.get("resId")

        # ── Rating ────────────────────────────────────────────────
        rating = None
        avg_rating = info.get("avgRating") or info.get("avgRatingString")
        if avg_rating is not None:
            rating = _clean_float(str(avg_rating))

        # Fallback: totalRatingsString sometimes contains the rating
        if rating is None:
            total_str = info.get("totalRatingsString", "")
            if total_str:
                rating = _clean_float(total_str)

        # ── Cost ──────────────────────────────────────────────────
        cost_for_two = None
        cost_for_one = None

        # costForTwo is usually a string like "₹400 for two"
        cft_raw = info.get("costForTwo") or info.get("costForTwoMessage") or ""
        if cft_raw:
            cost_for_two = _clean_int(str(cft_raw))

        if cost_for_two is not None:
            cost_for_one = cost_for_two // 2

        # ── Cuisines ──────────────────────────────────────────────
        cuisines = None
        cuisine_list = info.get("cuisines", [])
        if isinstance(cuisine_list, list) and cuisine_list:
            # Swiggy returns cuisines as a list of strings: ["Pizza", "Italian"]
            cuisines = ", ".join(str(c) for c in cuisine_list if c)

        # ── Thumbnail ─────────────────────────────────────────────
        thumbnail = None
        cloud_id = info.get("cloudinaryImageId")
        if cloud_id:
            thumbnail = f"https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_660/{cloud_id}"
        elif info.get("image"):
            # Some responses include a direct image URL
            thumbnail = info["image"]

        # ── Area / Locality ───────────────────────────────────────
        area = info.get("areaName") or info.get("locality") or info.get("area")

        # ── Delivery time ─────────────────────────────────────────
        delivery_time = None
        sla = info.get("sla", {})
        if isinstance(sla, dict):
            # deliveryTime is usually an integer (minutes)
            dt = sla.get("deliveryTime")
            if dt is not None:
                delivery_time = _clean_int(str(dt))
            elif sla.get("slaString"):
                # Parse "26-31 min" → take the first number
                delivery_time = _clean_int(str(sla["slaString"]))

        # ── Restaurant URL ────────────────────────────────────────
        restaurant_url = None
        cta = info.get("cta", {})
        if isinstance(cta, dict):
            link = cta.get("link", "")
            if link:
                if link.startswith("http"):
                    restaurant_url = link.split("?")[0]
                else:
                    restaurant_url = f"https://www.swiggy.com{link.split('?')[0]}"
        # Fallback: construct from slug if available
        if not restaurant_url and info.get("slugs", {}).get("restaurant"):
            slug = info["slugs"]["restaurant"]
            city_slug = info.get("slugs", {}).get("city", "")
            if city_slug:
                restaurant_url = f"https://www.swiggy.com/city/{city_slug}/{slug}"

        # ── Discount / Offer ──────────────────────────────────────
        discount = None
        discount_info = info.get("aggregatedDiscountInfoV3") or info.get("aggregatedDiscountInfo") or {}
        if isinstance(discount_info, dict):
            header = discount_info.get("header", "")
            sub = discount_info.get("subHeader", "")
            if header:
                discount = f"{header} {sub}".strip() if sub else header

        return {
            "platform": "swiggy",
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


# ── DOM Fallback Parser ───────────────────────────────────────────────────────

def _scrape_dom_fallback(page) -> list[dict]:
    """
    Fallback DOM scraping when API interception yields no results.

    Targets Swiggy's restaurant cards rendered on the search results page.
    This is less reliable than API interception but provides a safety net.
    """
    restaurants = []

    try:
        # Swiggy renders restaurant cards in various containers
        # Common selectors for restaurant cards
        selectors = [
            '[data-testid="restaurant-card"]',
            '.sc-beySPh',  # styled-component class (may change)
            '.RestaurantList__RestaurantListItem',
            'a[href*="/restaurants/"]',
            'div[class*="restaurant"]',
        ]

        cards = []
        for sel in selectors:
            cards = page.query_selector_all(sel)
            if cards:
                logger.info(f"DOM fallback: found {len(cards)} cards with selector '{sel}'")
                break

        if not cards:
            logger.warning("DOM fallback: no restaurant cards found")
            return []

        for card in cards:
            try:
                # Try to extract text content from the card
                text = card.inner_text()
                lines = [l.strip() for l in text.split("\n") if l.strip()]

                if len(lines) < 2:
                    continue

                name = lines[0]

                # Try to find rating, cost, delivery time from text
                rating = None
                cost_for_two = None
                delivery_time = None
                cuisines_str = None

                for line in lines[1:]:
                    if rating is None:
                        r = _clean_float(line)
                        if r:
                            rating = r
                            continue

                    if cost_for_two is None and "₹" in line:
                        cost_for_two = _clean_int(line)
                        continue

                    if delivery_time is None and "min" in line.lower():
                        delivery_time = _clean_int(line)
                        continue

                    # Lines with commas are likely cuisines
                    if cuisines_str is None and "," in line and len(line) > 5:
                        cuisines_str = line

                # Get link
                restaurant_url = None
                link = card.get_attribute("href")
                if link:
                    if link.startswith("/"):
                        restaurant_url = f"https://www.swiggy.com{link}"
                    elif link.startswith("http"):
                        restaurant_url = link

                if not link:
                    anchor = card.query_selector("a")
                    if anchor:
                        link = anchor.get_attribute("href")
                        if link and link.startswith("/"):
                            restaurant_url = f"https://www.swiggy.com{link}"
                        elif link:
                            restaurant_url = link

                restaurants.append({
                    "platform": "swiggy",
                    "restaurant_id": None,
                    "restaurant_name": name,
                    "rating": rating,
                    "cost_for_one": cost_for_two // 2 if cost_for_two else None,
                    "cost_for_two": cost_for_two,
                    "delivery_time_minutes": delivery_time,
                    "cuisines": cuisines_str,
                    "discount": None,
                    "thumbnail": None,
                    "area": None,
                    "restaurant_url": restaurant_url,
                })

            except Exception as e:
                logger.debug(f"DOM card parse error: {e}")
                continue

    except Exception as e:
        logger.error(f"DOM fallback error: {e}")

    return restaurants


# ── Main Scraper ──────────────────────────────────────────────────────────────

def scrape_swiggy(query: str, city: str = "delhi") -> list[dict]:
    """
    Scrape Swiggy for restaurants matching a food query.

    Loads Swiggy to establish a browser session, then calls the search
    API directly via page.evaluate(fetch(...)). This is more reliable than
    passive interception because Swiggy's SPA does not fire the search API
    during normal page navigation in headless mode.

    Also intercepts any additional API responses during page load as a
    secondary data source, and falls back to DOM scraping if needed.

    Returns a deduplicated list of restaurant dicts.
    """
    coords = _get_city_coords(city)
    api_responses: list[dict] = []

    def handle_response(response: Response) -> None:
        """Intercept JSON API responses from Swiggy (secondary source)."""
        url = response.url

        if "swiggy.com" not in url:
            return

        skip = [".png", ".jpg", ".svg", ".js", ".css", ".woff", ".ico",
                "analytics", "sentry", "clarity", "facebook", "google",
                "hotjar", "segment", "mixpanel", "amplitude",
                "funnel", "track", "log", "perf"]
        if any(k in url.lower() for k in skip):
            return

        content_type = response.headers.get("content-type", "")
        if "json" not in content_type:
            return

        try:
            body = response.json()
            if not isinstance(body, dict) or len(str(body)) < 300:
                return

            logger.debug(f"Intercepted Swiggy API: {url[:100]}")
            api_responses.append(body)
        except Exception:
            pass

    dom_restaurants: list[dict] = []
    direct_api_data: dict | None = None

    try:
        with sync_playwright() as p:
            logger.info(f"Scraping Swiggy: query='{query}', city={city}")

            browser = p.chromium.launch(
                headless=True,
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

            # Set Swiggy location cookies (lat/lng based)
            context.add_cookies([
                {
                    "name": "userLocation",
                    "value": f'{{"lat":{coords["lat"]},"lng":{coords["lng"]},"address":"{city.title()}","id":"","annotation":""}}',
                    "domain": ".swiggy.com",
                    "path": "/",
                },
                {
                    "name": "swgy_home_lat",
                    "value": str(coords["lat"]),
                    "domain": ".swiggy.com",
                    "path": "/",
                },
                {
                    "name": "swgy_home_lng",
                    "value": str(coords["lng"]),
                    "domain": ".swiggy.com",
                    "path": "/",
                },
                {
                    "name": "lat",
                    "value": str(coords["lat"]),
                    "domain": ".swiggy.com",
                    "path": "/",
                },
                {
                    "name": "lng",
                    "value": str(coords["lng"]),
                    "domain": ".swiggy.com",
                    "path": "/",
                },
            ])

            page = context.new_page()
            page.on("response", handle_response)

            # Step 1: Load Swiggy homepage to establish browser session/cookies.
            # Use networkidle to wait for the SPA to fully settle (Swiggy does
            # client-side redirects that destroy the execution context).
            logger.info("Loading Swiggy homepage to establish session...")
            try:
                page.goto("https://www.swiggy.com/", wait_until="networkidle", timeout=25000)
            except Exception:
                # networkidle can timeout on heavy pages — that's OK
                pass

            # Wait for page to stabilise (SPA redirects, dynamic content)
            try:
                page.wait_for_load_state("domcontentloaded", timeout=5000)
            except Exception:
                pass
            _random_delay(2000, 3000)

            # Step 2: Call the search API directly using browser's fetch.
            # Swiggy's SPA does NOT fire the search API during page navigation
            # in headless mode — we must call it explicitly.
            lat, lng = coords["lat"], coords["lng"]
            search_api_url = (
                f"https://www.swiggy.com/dapi/restaurants/search/v3"
                f"?lat={lat}&lng={lng}&str={query}"
                f"&trackingId=undefined&submitAction=ENTER&queryUniqueId="
            )
            logger.info(f"Calling Swiggy search API directly: {search_api_url[:100]}")

            try:
                direct_api_data = page.evaluate("""async (url) => {
                    try {
                        const resp = await fetch(url, {
                            headers: {
                                'Content-Type': 'application/json',
                                '__fetch_req__': 'true',
                            }
                        });
                        return await resp.json();
                    } catch(e) {
                        return null;
                    }
                }""", search_api_url)

                if direct_api_data and isinstance(direct_api_data, dict):
                    logger.info("Direct API call successful")
                else:
                    logger.warning("Direct API call returned empty/invalid response")
                    direct_api_data = None
            except Exception as e:
                logger.error(f"Direct API call failed: {e}")
                direct_api_data = None

            # Step 3: Also try passive interception by navigating to search page
            if direct_api_data is None:
                search_url = f"https://www.swiggy.com/search?query={query}"
                logger.info(f"Falling back to page navigation: {search_url}")
                try:
                    page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
                    _random_delay(3000, 5000)

                    for i in range(5):
                        page.mouse.wheel(0, 700)
                        _random_delay(800, 1500)

                    # Try clicking the Restaurants tab
                    try:
                        rest_tab = page.query_selector('button:has-text("Restaurants")')
                        if not rest_tab:
                            rest_tab = page.query_selector('div:has-text("Restaurants"):not(:has(div))')
                        if rest_tab:
                            rest_tab.click()
                            _random_delay(2000, 3000)
                    except Exception:
                        pass

                    _random_delay(1000, 2000)
                except Exception as e:
                    logger.warning(f"Page navigation fallback failed: {e}")

            # Step 4: DOM fallback if we still have very little data
            if direct_api_data is None and len(api_responses) < 2:
                logger.info("Attempting DOM fallback scrape")
                dom_restaurants = _scrape_dom_fallback(page)

            browser.close()
            logger.info("Browser closed")

    except Exception as e:
        logger.error(f"Playwright error: {e}")
        return []

    # Parse results and deduplicate
    collected: list[dict] = []
    seen_ids: set[str] = set()
    seen_names: set[str] = set()

    def _add_unique(restaurants: list[dict]) -> None:
        """Add restaurants to collected list, deduplicating by ID then name."""
        for r in restaurants:
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

    # Source 1: Direct API response (primary)
    if direct_api_data:
        parsed = _parse_api_response(direct_api_data)
        logger.info(f"Direct API: parsed {len(parsed)} restaurants")
        _add_unique(parsed)

    # Source 2: Intercepted API responses (secondary)
    if api_responses:
        logger.info(f"Parsing {len(api_responses)} intercepted API responses")
        for response_data in api_responses:
            parsed = _parse_api_response(response_data)
            _add_unique(parsed)

    # Source 3: DOM fallback
    _add_unique(dom_restaurants)

    logger.info(f"Total: {len(collected)} unique Swiggy restaurants")
    return collected


# ── Entry Point (for standalone testing) ──────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    results = scrape_swiggy(query="pizza", city="delhi")

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
        print(f"    Area     : {r['area']}")
        print(f"    URL      : {r['restaurant_url']}")
