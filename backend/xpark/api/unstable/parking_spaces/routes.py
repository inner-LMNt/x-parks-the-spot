from . import bp
from xpark.logic.parkingspace import (
    create_parking_space,
    get_parking_space,
    update_parking_space,
    delete_parking_space,
    get_owned_parking_spaces,
    handle_submit_verification,
    handle_verify_parking,
)
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.get("")
@require_logged_in_user
def get_owned_parking_spaces_route(user_id: uuid.UUID, token: str) -> Tuple[Any, int]: # use token eventually?
    match get_owned_parking_spaces(user_id):
        case Ok(data):
            return data, 200
        case Err(e):
            return {"error": str(e)}, 500


@bp.post("verify-parking-space")
@require_logged_in_user
def verify_parking_space(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    # Parse the request JSON body for the spot ID and verification decision
    data = request.get_json()
    spot_id = data.get("spotId")
    is_verified = data.get("is_verified")
    try:
        parking_space_uuid = uuid.UUID(spot_id)
    except ValueError:
        return {"error": "Invalid parking_space_id format"}, 400

    match handle_verify_parking(parking_space_uuid, is_verified):
        case Ok(updated_space):
            return updated_space, 200
        case Err(e):
            return {"error": str(e)}, 400


@bp.post("")
@require_logged_in_user
def create_parking_space_route(user_id: uuid.UUID, token: str) -> Tuple[Any, int]: # use token eventually?
    data = request.form.get("data")
    image_file = request.files.get("image")

    result = create_parking_space(user_id=user_id, data=data, image_file=image_file)

    if result.is_ok():
        return result.unwrap(), 201
    else:
        return {"error": result.unwrap_err()}, 400


@bp.get("<parking_space_id>")
def get_parking_space_route(parking_space_id: str) -> Tuple[Any, int]:
    parking_space_uuid = uuid.UUID(parking_space_id)

    match get_parking_space(parking_space_uuid):
        case Ok(parking_space):
            return parking_space, 200
        case Err(e):
            return {"error": str(e)}, 404


@bp.post("spot-verification")
@require_logged_in_user
def submit_verification(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    spot_id = uuid.UUID(request.form.get('spotID'))
    image_file = request.files.get("image")
    result = handle_submit_verification(user_id=user_id, parking_space_id=spot_id, image_file=image_file)
    if result.is_ok():
        return result.unwrap(), 201
    else:
        return {"error": result.unwrap_err()}, 400


@bp.patch("<parking_space_id>")
@require_logged_in_user
def update_parking_space_route(
    parking_space_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    data = request.get_json()
    if not data:
        return {"error": "Invalid input"}, 400

    parking_space_uuid = uuid.UUID(parking_space_id)
    location = data.get("location")
    if location:
        address = location.get("address")
    else:
        address = None
    if location:
        latitude = location.get("latitude")
    else:
        latitude = None
    if location:
        longitude = location.get("longitude")
    else:
        longitude = None
    pricing_info = data.get("pricing_info")
    if pricing_info:
        price_per_hour = pricing_info.get("base_price")
    else:
        price_per_hour = None
    reverification_required = data.get("reverification_required")

    match update_parking_space(
        user_id=user_id,
        parking_space_id=parking_space_uuid,
        name=data.get("name"),
        address=address,
        latitude=latitude,
        longitude=longitude,
        availability_schedule=data.get("availability_schedule"),
        price_per_hour=price_per_hour,
        reverification_required=reverification_required
    ):
        case Ok(parking_space):
            return parking_space, 200
        case Err(e):
            return {"err": e}, 400


@bp.delete("<parking_space_id>")
@require_logged_in_user
def delete_parking_space_route(
    parking_space_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    parking_space_uuid = uuid.UUID(parking_space_id)

    match delete_parking_space(user_id, parking_space_uuid):
        case Ok(_):
            return {}, 200
        case Err(e):
            status_code = 403 if "not authorized" in str(e) else 404
            return {"error": str(e)}, status_code
