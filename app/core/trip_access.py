"""
app/core/trip_access.py - THE single home for trip authorization

Replaces the seven near-identical `_check_trip_access` /
`check_trip_access` / `get_trip_or_404` helpers scattered across
routers. Authorization logic must live in exactly one place: every
future security review of "who can touch a trip?" reduces to auditing
this file.

Access levels
-------------
VIEW   owner, or any TripShare row for this user.
EDIT   owner, or a TripShare with permission == "edit".
       NOTE: this ENFORCES the previously-dead `TripShare.permission`
       column. Today all shares are "view", so EDIT currently means
       owner-only — which FIXES the existing bug where view-only
       shared users could create/modify expenses and other child
       objects (e.g. expenses.py:100 called check_trip_access without
       require_owner on a mutation path).
OWNER  owner only (delete trip, manage shares, etc.).

Error semantics (deliberate, document-once)
-------------------------------------------
* No access at all  -> 404. Existence is not leaked (house style).
* Can VIEW but lacks the required level -> 403. The user already
  knows the trip exists, so 404 would be dishonest and confusing;
  403 tells a viewer "you can see this, not change it".

Usage
-----
1) Path-based routes ("/trips/{trip_id}/..."):

       from app.core.trip_access import TripAccess

       @router.post("/trips/{trip_id}/expenses")
       def create_expense(
           payload: ExpenseCreate,
           trip: models.Trip = Depends(TripAccess("edit")),
       ): ...

   The dependency resolves `trip_id` from the path, authorizes, and
   hands the route a loaded Trip. No db/user boilerplate in the route.

2) Body/child-object routes (trip id known only after a lookup):

       from app.core.trip_access import get_trip_with_access

       trip = get_trip_with_access(expense.trip_id, db, current_user, "edit")

Both call the same core function; there is no second code path.

Author: Travel Planner Team
"""

from typing import Literal

from fastapi import Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user
from database import get_db

AccessLevel = Literal["view", "edit", "owner"]

# permission values on TripShare that satisfy each level
_EDIT_PERMISSIONS = ("edit",)


def get_trip_with_access(
    trip_id: int,
    db: Session,
    user: models.User,
    level: AccessLevel = "view",
) -> models.Trip:
    """Load a trip iff `user` holds `level` access; raise otherwise.

    Raises:
        HTTPException 404: trip absent OR user has no access at all.
        HTTPException 403: user can view but lacks `level`.
    """
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == user.id:
        return trip  # owners hold every level

    share = (
        db.query(models.TripShare)
        .filter(
            models.TripShare.trip_id == trip_id,
            models.TripShare.user_id == user.id,
        )
        .first()
    )

    if share is None:
        # No relationship to this trip whatsoever: hide existence.
        raise HTTPException(status_code=404, detail="Trip not found")

    if level == "view":
        return trip

    if level == "edit" and share.permission in _EDIT_PERMISSIONS:
        return trip

    # Viewer asking for edit/owner: existence is already known -> 403.
    raise HTTPException(
        status_code=403,
        detail=f"This action requires {level} access to the trip",
    )


def TripAccess(level: AccessLevel = "view"):
    """Dependency factory for routes with `trip_id` in the path.

    Named like a class because it is used as one at call sites:
    `Depends(TripAccess("edit"))`. Returns the authorized Trip, so
    routes that previously did lookup + check + use now just use.
    """

    def _dependency(
        trip_id: int = Path(..., ge=1),
        db: Session = Depends(get_db),
        user: models.User = Depends(get_current_user),
    ) -> models.Trip:
        return get_trip_with_access(trip_id, db, user, level)

    return _dependency


# ---------------------------------------------------------------------
# Migration map (delete each router-local helper as you convert it):
#
#   router                    old helper              read    mutate
#   ------------------------  ----------------------  ------  --------
#   trips.py                  get_trip_or_404         view    owner
#   expenses.py               check_trip_access       view    edit  (*)
#   accommodations.py         _check_trip_access      view    edit
#   activities.py             _check_trip_access      view    edit
#   packing.py                check_trip_access       view    edit
#   pre_trip_tasks.py         _check_trip_access      view    edit
#   trip_transports.py        _check_trip_access      view    edit
#   transport_options.py      (via transport)         view    edit
#   destinations.py           inline user_id check    view    edit
#
# (*) BEHAVIOUR CHANGE: mutation endpoints that previously accepted
#     any shared user now require an "edit" share. Since every
#     existing share is "view", shared users lose write access they
#     should never have had. Release-note it.
# ---------------------------------------------------------------------
