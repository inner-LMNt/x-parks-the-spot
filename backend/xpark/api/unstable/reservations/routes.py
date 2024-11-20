import zoneinfo
from datetime import datetime

from xpark.logic.reservations import (
    update_reservation,
    get_reservation,
    create_reservation,
    get_user_reservations,
    get_owner_reservations,
    cancel_reservation_logic,
    get_max_extension_time_logic,
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
        start_time=datetime.fromisoformat(request.json["start_time"]),  # type: ignore
        end_time=datetime.fromisoformat(request.json["end_time"]),  # type: ignore
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


@bp.route("/<reservation_id>", methods=["PUT"])
@require_logged_in_user
def update_reservation_route(
    reservation_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Update an existing reservation.
    """
    data = request.get_json()

    start_time = data.get("start_time")
    end_time = data.get("end_time")
    car_info_uuid = data.get("car_info_uuid")
    if end_time is not None:
        end_time = datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%S.%fZ").replace(
            tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC")
        )
    if start_time is not None:
        start_time = datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%S.%fZ").replace(
            tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC")
        )
    reservation_uuid = uuid.UUID(reservation_id)

    # Call update_reservation with individual parameters
    match update_reservation(
        user_id, reservation_uuid, start_time, end_time, car_info_uuid
    ):
        case Ok(reservation):
            return reservation, 200
        case Err(e):
            if "not authorized" in e:
                return {"err": e}, 403
            elif "not found" in e:
                return {"err": e}, 404
            else:
                return {"err": e}, 400


@bp.get("<reservation_id>/max-extension")
@require_logged_in_user
def get_max_extension_time_route(
    reservation_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Get maximum extension time for a reservation.
    """
    reservation_uuid = uuid.UUID(reservation_id)

    match get_max_extension_time_logic(user_id, reservation_uuid):
        case Ok(max_extension_time):
            return {"maxExtensionTime": max_extension_time}, 200
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


@bp.get("owner")
@require_logged_in_user
def get_owner_reservations_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_owner_reservations(user_id):
        case Ok(data):
            return data, 200
        case Err(e):
            return {"err": e}, 500
