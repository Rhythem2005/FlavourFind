"""Pydantic schemas for Restaurant API responses."""

from pydantic import BaseModel
from typing import Optional

class RestaurantSchema(BaseModel):
    """Schema for restaurant information."""
    
    id: int
    name: str
    platform: str
    platform_id: str
    cuisine_types: Optional[str] = None
    rating: Optional[float] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True
