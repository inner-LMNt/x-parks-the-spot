from xpark.logic.reservations import (
    update_reservation,
    get_reservation,
    create_reservation,
    get_user_reservations,
    cancel_reservation_logic,
    lock_parking_space,
    unlock_parking_space,
)
from . import bp
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.get("")
@require_logged_in_user
def get_user_reservations_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_user_reservations(user_id):
        case Ok(data):
            return data, 200
        case Err(e):
            return {"err": e}, 500


@bp.post("")
@require_logged_in_user
def create_reservation_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match create_reservation(
        user_id,
        parking_space_id=request.json["parking_space_id"],  # type: ignore
        start_time=request.json["start_time"],  # type: ignore
        end_time=request.json["end_time"],  # type: ignore
        car_info_id=request.json["car_info_id"],  # type: ignore
    ):
        case Ok(reservation):
            return reservation, 201
        case Err(e):
            if "already locked" in e or "already reserved" in e:
                return {"err": e}, 409
            elif "not authorized" in e:
                return {"err": e}, 403
            else:
                return {"err": e}, 400


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
            if "not authorized" in e:
                return {"err": e}, 403
            elif "not found" in e:
                return {"err": e}, 404
            else:
                return {"err": e}, 400


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

    match update_reservation(user_id, reservation_uuid, data):
        case Ok(reservation):
            return reservation, 200
        case Err(e):
            if "not authorized" in e:
                return {"err": e}, 403
            elif "not found" in e:
                return {"err": e}, 404
            else:
                return {"err": e}, 400


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
            if "not authorized" in e:
                return {"err": e}, 403
            elif "not found" in e:
                return {"err": e}, 404
            else:
                return {"err": e}, 400


@bp.post("/lock")
@require_logged_in_user
def lock_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    parking_space_id = request.json["parking_space_id"]
    lock_duration = request.json["lock_duration"]

    result = lock_parking_space(user_id, parking_space_id, lock_duration)
    match result:
        case Ok(_):
            return {}, 200
        case Err(e):
            return {"err": e}, 400


@bp.post("/unlock")
@require_logged_in_user
def unlock_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Unlock a previously locked parking space.
    """
    parking_space_id = request.json["parking_space_id"]

    match unlock_parking_space(user_id, parking_space_id):
        case Ok(_):
            return {"Successfully Locked"}, 200
        case Err(e):
            return {"err": "Parking space is not currently locked by the user."}, 400