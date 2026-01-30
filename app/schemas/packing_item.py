"""
app/schemas/packing_item.py - PackingItem Pydantic schemas

Defines PackingItem-related Pydantic models and packing summary schemas.

Author: Travel Planner Team
"""

from pydantic import BaseModel
from typing import Optional


class PackingItemBase(BaseModel):
    item_name: str
    category: Optional[str] = None
    quantity: int = 1
    is_packed: bool = False


class PackingItemCreate(PackingItemBase):
    trip_id: int


class PackingItemUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    is_packed: Optional[bool] = None


class PackingItem(PackingItemBase):
    id: int
    trip_id: int

    model_config = {"from_attributes": True}


class PackingCategoryDetail(BaseModel):
    """Detail for a packing category"""

    total: int
    packed: int
    items: list[PackingItem]


class PackingSummary(BaseModel):
    """Summary of packing items for a trip"""

    total_items: int
    packed_items: int
    progress_percent: int
    by_category: dict[str, PackingCategoryDetail]
