import logging

from scrapers.zomato.scraper import scrape_zomato

logger = logging.getLogger(__name__)


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