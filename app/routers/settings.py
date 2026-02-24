import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import get_db
from app import models, schemas
from app.core.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=schemas.UserSettingsResponse)
def get_user_settings(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == current_user.id)
        .first()
    )
    if not settings:
        settings = models.UserSettings(
            user_id=current_user.id,
            feature_flags={
                "road_trip_builder": True,
                "expense_tracking": True,
                "packing_list": True,
            },
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    if isinstance(settings.feature_flags, str):
        settings.feature_flags = json.loads(settings.feature_flags)

    return settings


@router.patch("/", response_model=schemas.UserSettingsResponse)
def update_user_settings(
    settings_update: schemas.UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == current_user.id)
        .first()
    )
    if not settings:
        settings = models.UserSettings(user_id=current_user.id, feature_flags={})
        db.add(settings)
        db.commit()
        db.refresh(settings)

    update_data = settings_update.model_dump(exclude_unset=True)

    if "feature_flags" in update_data:
        # merge feature flags
        flags = settings.feature_flags or {}
        if isinstance(flags, str):
            flags = json.loads(flags)

        flags.update(update_data["feature_flags"])
        settings.feature_flags = flags.copy()
        flag_modified(settings, "feature_flags")
        update_data.pop("feature_flags")

    for key, value in update_data.items():
        setattr(settings, key, value)

    db.add(settings)
    db.commit()
    db.refresh(settings)

    if isinstance(settings.feature_flags, str):
        settings.feature_flags = json.loads(settings.feature_flags)

    return settings
