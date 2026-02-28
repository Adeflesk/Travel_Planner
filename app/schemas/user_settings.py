from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class UserSettingsBase(BaseModel):
    default_currency: str = "USD"
    home_base: Optional[str] = None
    feature_flags: Dict[str, Any] = {}


class UserSettingsUpdate(BaseModel):
    default_currency: Optional[str] = None
    home_base: Optional[str] = None
    feature_flags: Optional[Dict[str, Any]] = None


class UserSettingsResponse(UserSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
