from typing import Any, Dict, Optional
from pydantic import BaseModel


class UserSettingsBase(BaseModel):
    default_currency: str = "USD"
    home_base: Optional[str] = None
    feature_flags: Dict[str, Any] = {}


class UserSettingsUpdate(BaseModel):
    default_currency: Optional[str] = None
    home_base: Optional[str] = None
    feature_flags: Optional[Dict[str, Any]] = None


class UserSettingsResponse(UserSettingsBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
