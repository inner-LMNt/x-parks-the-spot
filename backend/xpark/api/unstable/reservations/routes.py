from xpark.logic.reservations import unlock_parking_space, lock_parking_space, update_reservation_logic, \
    get_reservation, create_reservation, get_user_reservations, cancel_reservation_logic
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
            return {'error': str(e)}, 500


@bp.post("")
@require_logged_in_user
def create_reservation_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Create a new reservation.
    """
    data = request.get_json()
    logger.debug("Received JSON data: %s", data)
    if not data:
        return {'error': 'Invalid input'}, 400

    # Ensure renter_id matches the authenticated user
    reservation_request = {
        "parking_space_id": data.get('parking_space_id'),
        "start_time": data.get('start_time'),
        "end_time": data.get('end_time'),
        "car_info_id": data.get('car_info_id'),
        "renter_id": str(user_id),
    }

    match create_reservation(user_id=user_id, data=reservation_request):
        case Ok(reservation):
            return reservation, 201
        case Err(e):
            if "already locked" in str(e) or "already reserved" in str(e):
                return {'error': str(e)}, 409
            elif "not authorized" in str(e):
                return {'error': str(e)}, 403
            else:
                logger.error(str(e))
                return {'error': str(e)}, 400


@bp.get("<reservation_id>")
@require_logged_in_user
def get_reservation_route(reservation_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Get reservation details by ID.
    """
    try:
        reservation_uuid = uuid.UUID(reservation_id)
    except ValueError:
        return {"error": "Invalid reservation ID"}, 400

    match get_reservation(user_id, reservation_uuid):
        case Ok(reservation):
            return reservation, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"error": str(e)}, 403
            elif "not found" in str(e):
                return {"error": str(e)}, 404
            else:
                return {"error": str(e)}, 400


@bp.put("<reservation_id>")
@require_logged_in_user
def update_reservation_route(reservation_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Update an existing reservation.
    """
    data = request.get_json()
    if not data:
        return {'error': 'Invalid input'}, 400

    try:
        reservation_uuid = uuid.UUID(reservation_id)
    except ValueError:
        return {"error": "Invalid reservation ID"}, 400

    match update_reservation_logic(user_id, reservation_uuid, data):
        case Ok(reservation):
            return reservation, 200
        case Err(e):
            if "not authorized" in str(e):
                return {'error': str(e)}, 403
            elif "not found" in str(e):
                return {'error': str(e)}, 404
            else:
                return {'error': str(e)}, 400


@bp.delete("<reservation_id>")
@require_logged_in_user
def cancel_reservation_route(reservation_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Cancel a reservation.
    """
    try:
        reservation_uuid = uuid.UUID(reservation_id)
    except ValueError:
        return {"error": "Invalid reservation ID"}, 400

    match cancel_reservation_logic(user_id, reservation_uuid):
        case Ok(_):
            return {"message": "Reservation canceled successfully."}, 200
        case Err(e):
            if "not authorized" in str(e):
                return {'error': str(e)}, 403
            elif "not found" in str(e):
                return {'error': str(e)}, 404
            else:
                return {'error': str(e)}, 400
@bp.post("/lock")
@require_logged_in_user
def lock_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    logger.debug("Received /lock request from user_id: %s", user_id)
    data = request.get_json()
    logger.debug("Request JSON data: %s", data)
    if not data:
        logger.error("Invalid input: No JSON data received.")
        return {'error': 'Invalid input'}, 400

    parking_space_id = data.get('parking_space_id')
    lock_duration = data.get('lock_duration')

    if not parking_space_id or not lock_duration:
        logger.error("Missing required fields: parking_space_id or lock_duration.")
        return {'error': 'Missing required fields'}, 400

    try:
        parking_space_uuid = uuid.UUID(parking_space_id)
    except ValueError:
        logger.error("Invalid parking space ID format: %s", parking_space_id)
        return {"error": "Invalid parking space ID"}, 400

    result = lock_parking_space(user_id, parking_space_uuid, lock_duration)
    match result:
        case Ok(response_data):
            # Convert lock_until to Unix timestamp in milliseconds
            expires_at_timestamp = int(response_data['lock_until'].timestamp() * 1000)
            response_data = {
                "expiresAt": expires_at_timestamp
            }
            logger.debug("Parking space locked successfully until %s.", expires_at_timestamp)
            return response_data, 200
        case Err(e):
            logger.error("Locking failed: %s", e)
            if "already locked" in str(e) or "reserved" in str(e):
                return {'error': str(e)}, 409
            elif "not authorized" in str(e):
                return {'error': str(e)}, 403
            else:
                return {'error': str(e)}, 400


@bp.post("/unlock")
@require_logged_in_user
def unlock_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Unlock a previously locked parking space.
    """
    data = request.get_json()
    if not data:
        return {'error': 'Invalid input'}, 400

    parking_space_id = data.get('parking_space_id')

    if not parking_space_id:
        return {'error': 'Missing parking_space_id'}, 400

    try:
        parking_space_uuid = uuid.UUID(parking_space_id)
    except ValueError:
        return {"error": "Invalid parking space ID"}, 400

    match unlock_parking_space(user_id, parking_space_uuid):
        case Ok(_):
            return {"message": "Parking space unlocked successfully."}, 200
        case Err(e):
            if "not locked by user" in str(e):
                return {'error': str(e)}, 404
            elif "not authorized" in str(e):
                return {'error': str(e)}, 403
            else:
                return {'error': str(e)}, 400