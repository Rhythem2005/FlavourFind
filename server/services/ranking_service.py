def get_cheapest_option(results):
    if not results:
        return None

    valid = [r for r in results if r.get("price") is not None]

    return min(valid, key=lambda x: x["price"]) if valid else None


def get_fastest_option(results):
    valid = [
        r for r in results
        if r.get("delivery_time") is not None
    ]

    if not valid:
        return None

    return min(valid, key=lambda x: x["delivery_time"])


def get_highest_rated_option(results):
    valid = [
        r for r in results
        if r.get("rating") is not None
    ]

    if not valid:
        return None

    return max(valid, key=lambda x: x["rating"])


def get_best_overall_option(results):
    valid = [
        r for r in results
        if r.get("rating") is not None
        and r.get("price") is not None
    ]

    if not valid:
        return None

    def score(item):
        delivery = item.get("delivery_time")

        delivery_score = (
            (60 - min(delivery, 60)) / 60 * 0.2
            if delivery is not None
            else 0
        )

        price = min(item["price"], 500)

        return (
            item["rating"] * 0.5
            + (500 - price) / 500 * 0.3
            + delivery_score
        )

    return max(valid, key=score)