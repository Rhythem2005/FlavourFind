"""Pydantic schema for structured search intent extracted from natural language queries."""

from pydantic import BaseModel, Field
from typing import Optional


class SearchIntent(BaseModel):
    """
    Structured search intent extracted by the Gemini NLU layer.

    This is the contract between query_understanding → search_service → ranking_service.
    All fields are optional so the system degrades gracefully when Gemini
    cannot extract a field (or when running without the API key).
    """

    food_search_term: Optional[str] = Field(
        default=None,
        description="The food type / cuisine to search for on Zomato (e.g., 'pizza', 'biryani'). "
                    "None if the user didn't specify a food type.",
    )

    budget: Optional[int] = Field(
        default=None,
        description="Maximum budget in ₹.  Interpreted as total spend for the group.",
    )

    group_size: int = Field(
        default=1,
        description="Number of people eating.  Defaults to 1 if not mentioned.",
    )

    preferences: list[str] = Field(
        default_factory=list,
        description="Additional user preferences extracted from the query. "
                    "Examples: 'discounts', 'fast delivery', 'highly rated', 'late night', 'vegetarian'.",
    )

    ranking_priority: str = Field(
        default="balanced",
        description="Primary ranking axis. One of: "
                    "'affordability', 'rating', 'value_for_money', 'speed', 'discounts', 'balanced'.",
    )

    @property
    def budget_per_person(self) -> Optional[int]:
        """Effective per-person budget derived from total budget and group size."""
        if self.budget is None:
            return None
        return max(1, self.budget // max(1, self.group_size))
