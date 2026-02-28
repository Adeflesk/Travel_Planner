from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user
from app.schemas.transport_option import (
    TransportOptionCreate,
    TransportOptionUpdate,
    TransportOptionRead,
)
from database import get_db

router = APIRouter()


def _check_transport_access(
    transport_id: int,
    db: Session,
    current_user: models.User,
    require_owner: bool = False,
) -> models.TripTransport:
    transport = (
        db.query(models.TripTransport)
        .filter(models.TripTransport.id == transport_id)
        .first()
    )
    if not transport:
        raise HTTPException(status_code=404, detail="Transport not found")
    trip = db.query(models.Trip).filter(models.Trip.id == transport.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id == current_user.id:
        return transport
    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip.id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share:
            return transport
    raise HTTPException(status_code=404, detail="Transport not found")


def _get_option(
    option_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.TransportOption:
    option = (
        db.query(models.TransportOption)
        .filter(models.TransportOption.id == option_id)
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Transport option not found")
    _check_transport_access(option.transport_id, db, current_user, require_owner)
    return option


@router.get(
    "/transport/{transport_id}/options",
    response_model=List[TransportOptionRead],
)
def list_options(
    transport_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user)
    return (
        db.query(models.TransportOption)
        .filter(models.TransportOption.transport_id == transport_id)
        .order_by(models.TransportOption.order)
        .all()
    )


@router.post(
    "/transport/{transport_id}/options",
    response_model=TransportOptionRead,
    status_code=201,
)
def create_option(
    transport_id: int,
    data: TransportOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user, require_owner=True)
    option = models.TransportOption(transport_id=transport_id, **data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@router.get(
    "/transport/options/{option_id}",
    response_model=TransportOptionRead,
)
def get_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_option(option_id, db, current_user)


@router.put(
    "/transport/options/{option_id}",
    response_model=TransportOptionRead,
)
def update_option(
    option_id: int,
    data: TransportOptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    option = _get_option(option_id, db, current_user, require_owner=True)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(option, field, value)

    # When an option is selected, deselect other options and update parent transport
    if updates.get("status") == "selected":
        db.query(models.TransportOption).filter(
            models.TransportOption.transport_id == option.transport_id,
            models.TransportOption.id != option.id,
            models.TransportOption.status == "selected",
        ).update({"status": "researching"})
        transport = (
            db.query(models.TripTransport)
            .filter(models.TripTransport.id == option.transport_id)
            .first()
        )
        if transport:
            if option.carrier:
                transport.carrier = option.carrier
            if option.cost is not None:
                transport.cost = option.cost
            if option.currency:
                transport.currency = option.currency

    # When booked, set parent booked flag
    if updates.get("status") == "booked":
        transport = (
            db.query(models.TripTransport)
            .filter(models.TripTransport.id == option.transport_id)
            .first()
        )
        if transport:
            transport.booked = True
            if option.carrier:
                transport.carrier = option.carrier
            if option.cost is not None:
                transport.cost = option.cost

    db.commit()
    db.refresh(option)
    return option


@router.delete("/transport/options/{option_id}", status_code=204)
def delete_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    option = _get_option(option_id, db, current_user, require_owner=True)
    db.delete(option)
    db.commit()
