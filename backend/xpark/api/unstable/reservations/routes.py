from xpark.logic.reservations import (
    unlock_parking_space,
    lock_parking_space,
    update_reservation_logic,
    get_reservation,
    create_reservation,
    get_user_reservations,
    cancel_reservation_logic,
)
from . import bp
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid

import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@bp.get("")
@require_logged_in_user
def get_user_reservations_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Fetch current user's reservations.
    """
    match get_user_reservations(user_id):
        case Ok(data):
            return data, 200
        case Err(e):
            return {"err": str(e)}, 500


@bp.post("")
@require_logged_in_user
def create_reservation_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Create a new reservation.
    """

    # Ensure renter_id matches the authenticated user
    match create_reservation(
        user_id,
        parking_space_id=request.json["parking_space_id"],  # type: ignore
        start_time=request.json["start_time"],  # type: ignore
        end_time=request.json["end_time"],  # type: ignore
        car_info_id=request.json["car_info_id"],  # type: ignore
        renter_id=str(user_id),
    ):
        case Ok(reservation):
            return reservation, 201
        case Err(e):
            if "already locked" in str(e) or "already reserved" in str(e):
                return {"err": str(e)}, 409
            elif "not authorized" in str(e):
                return {"err": str(e)}, 403
            else:
                logger.error(str(e))
                return {"err": str(e)}, 400


@bp.get("<reservation_id>")
@require_logged_in_user
def get_reservation_route(
    reservation_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Get reservation details by ID.
    """
    reservation_uuid = uuid.UUID(reservation_id)

    match get_reservation(user_id, reservation_uuid):
        case Ok(reservation):
            return reservation, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"err": str(e)}, 403
            elif "not found" in str(e):
                return {"err": str(e)}, 404
            else:
                return {"err": str(e)}, 400


@bp.put("<reservation_id>")
@require_logged_in_user
def update_reservation_route(
    reservation_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Update an existing reservation.
    """
    data = request.get_json()
    if not data:
        return {"err": "Invalid input"}, 400

    reservation_uuid = uuid.UUID(reservation_id)

    match update_reservation_logic(user_id, reservation_uuid, data):
        case Ok(reservation):
            return reservation, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"err": str(e)}, 403
            elif "not found" in str(e):
                return {"err": str(e)}, 404
            else:
                return {"err": str(e)}, 400


@bp.delete("<reservation_id>")
@require_logged_in_user
def cancel_reservation_route(
    reservation_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Cancel a reservation.
    """
    reservation_uuid = uuid.UUID(reservation_id)

    match cancel_reservation_logic(user_id, reservation_uuid):
        case Ok(_):
            return {"message": "Reservation canceled successfully."}, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"err": str(e)}, 403
            elif "not found" in str(e):
                return {"err": str(e)}, 404
            else:
                return {"err": str(e)}, 400