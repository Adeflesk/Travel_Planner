"""
app/schemas/practicality.py - Practicality engine schemas

Defines response models for the journey practicality check endpoint.
"""

from __future__ import annotations

from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class SegmentPracticality(BaseModel):
    """Time and cost breakdown for a single segment."""

    segment_id: int
    segment_type: str
    name: str
    duration_minutes: int
    cost: Decimal
    items: List[str]


class PracticalityResponse(BaseModel):
    """Overall practicality assessment for a journey."""

    journey_id: int
    total_duration_minutes: int
    total_cost: Decimal
    time_limit_minutes: int
    daily_budget: Optional[Decimal] = None
    time_feasible: bool
    budget_feasible: bool
    buffer_minutes_per_transition: int
    transition_count: int
    segments: List[SegmentPracticality]
