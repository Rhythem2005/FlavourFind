"""Pydantic schemas for FoodItem API responses."""

from pydantic import BaseModel
from typing import Optional, List

class FoodItem(BaseModel):
    """Schema for a food item in search results."""
    
    id: int
    name: str
    restaurant_name: str
    restaurant_id: int
    price: float
    offer_text: Optional[str] = None
    offer_discount: Optional[float] = None
    delivery_charge: Optional[float] = None
    estimated_delivery_minutes: Optional[int] = None
    platform: str
    rating: Optional[float] = None
    review_count: Optional[int] = None
    cuisine: Optional[str] = None
    veg: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    
    class Config:
        from_attributes = True
