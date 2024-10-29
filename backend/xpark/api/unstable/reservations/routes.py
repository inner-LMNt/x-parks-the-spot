from xpark.logic.reservations import (
    update_reservation,
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
    match get_reservation(user_id, uuid.UUID(reservation_id)):
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


# @bp.post("/lock")
# @require_logged_in_user
# def lock_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
#     parking_space_id = request.json["parking_space_id"]  # type: ignore
#     lock_duration = request.json["lock_duration"]  # type: ignore
#
#     parking_space_uuid = uuid.UUID(parking_space_id)
#
#     result = lock_parking_space(user_id, parking_space_uuid, lock_duration)
#     match result:
#         case Ok(response_data):
#             # Convert lock_until to Unix timestamp in milliseconds
#             expires_at_timestamp = int(response_data["lock_until"].timestamp() * 1000)
#             response_data = {"expiresAt": expires_at_timestamp}
#             logger.debug(
#                 "Parking space locked successfully until %s.", expires_at_timestamp
#             )
#             return response_data, 200
#         case Err(e):
#             logger.error("Locking failed: %s", e)
#             if "already locked" in e or "reserved" in e:
#                 return {"err": e}, 409
#             elif "not authorized" in e:
#                 return {"err": e}, 403
#             else:
#                 return {"err": e}, 400
#
#
# @bp.post("/unlock")
# @require_logged_in_user
# def unlock_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
#     """
#     Unlock a previously locked parking space.
#     """
#     parking_space_id = request.json["parking_space_id"]  # type: ignore
#
#     if not parking_space_id:
#         return {"err": "Missing parking_space_id"}, 400
#
#     parking_space_uuid = uuid.UUID(parking_space_id)
#
#     match unlock_parking_space(user_id, parking_space_uuid):
#         case Ok(_):
#             return {"message": "Parking space unlocked successfully."}, 200
#         case Err(e):
#             if "not locked by user" in e:
#                 return {"err": e}, 404
#             elif "not authorized" in e:
#                 return {"err": e}, 403
#             else:
#                 return {"err": e}, 400
