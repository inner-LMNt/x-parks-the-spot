from . import bp
from xpark.logic.parkingspace import (
    create_free_parking_space,
    create_paid_parking_space,
    update_paid_parking_space,
    delete_free_parking_space,
    get_parking_space,
    is_paid_spot,
    get_all_user_parking_spaces,
    handle_submit_verification,
    submit_rating
)
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid
from flask.json import loads as load_json
from typing import cast, Dict


@bp.get("")
@require_logged_in_user
def get_all_user_parking_spaces_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_all_user_parking_spaces(user_id):
        case Ok(data):
            return {"spaces": data}, 200
        case Err(e):
            return {"err": e}, 500


@bp.post("")
@require_logged_in_user
def create_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    raw_data = request.form.get("data")
    image_file = request.files.get("image")
    if not raw_data:
        return {"err": "Missing data"}, 400
    # FIXME: limit size of JSON
    try:
        data = cast(Dict[str, Any], load_json(raw_data))
    except TypeError:
        return {"err": "bad input"}, 400

    if not data:
        return {"err": "Missing data"}, 400

    longitude = float(data["location"]["longitude"])
    latitude = float(data["location"]["latitude"])

    # TODO: get address from coordinates if not set
    if data["is_paid"]:
        result = create_paid_parking_space(
            name=data["name"],
            user_id=user_id,
            image_file=image_file,
            longitude=longitude,
            latitude=latitude,
            address=data["location"]["address"],
            price=float(data["pricing_info"]["base_price"]),
            availability_schedule=data["availability_schedule"],
        )
    else:
        result = create_free_parking_space(
            user_id=user_id,
            image_file=image_file,
            longitude=longitude,
            latitude=latitude,
            address="",
        )

    if result.is_ok():
        return result.unwrap(), 201
    else:
        return {"err": result.unwrap_err()}, 400


@bp.get("<parking_space_id>")
def get_parking_space_route(parking_space_id: str) -> Tuple[Any, int]:
    parking_space_uuid = uuid.UUID(parking_space_id)

    match get_parking_space(parking_space_uuid):
        case Ok(parking_space):
            return parking_space, 200
        case Err(e):
            return {"err": e}, 404


@bp.patch("<parking_space_id>")
@require_logged_in_user
def update_parking_space_route(
    parking_space_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    parking_space_uuid = uuid.UUID(parking_space_id)

    assert request.json is not None

    # Convert to float only if it is not None
    price_nullable = request.json.get("pricing_info", {}).get("base_price")
    price = float(price_nullable) if price_nullable else price_nullable

    match is_paid_spot(parking_space_uuid):
        case Ok(a):
            is_paid = a
        case Err(_):
            return {"err": "spot not found"}, 404
    if is_paid:
        match update_paid_parking_space(
            user_id=user_id,
            parking_space_id=parking_space_uuid,
            longitude=request.json.get("location", {}).get("longitude"),
            latitude=request.json.get("location", {}).get("latitude"),
            address=request.json.get("location", {}).get("address"),
            price=price,
            name=request.json.get("name"),
            availability_schedule=request.json.get("availability_schedule"),
        ):
            case Ok(parking_space):
                return parking_space, 200
            case Err(e):
                status_code = (
                    403 if "not authorized" in e else 404 if "not found" in e else 400
                )
                return {"err": e}, status_code
    else:
        return {"err": "not implemented: modifying free spot"}, 501


@bp.delete("<parking_space_id>")
@require_logged_in_user
def delete_parking_space_route(
    parking_space_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    parking_space_uuid = uuid.UUID(parking_space_id)

    match is_paid_spot(parking_space_uuid):
        case Ok(a):
            is_paid = a
        case Err(_):
            return {"err": "spot not found"}, 404
    if is_paid:
        return {"err": "Not allowed to delete paid spot"}, 403

    match delete_free_parking_space(user_id, parking_space_uuid):
        case Ok(_):
            return {}, 200
        case Err(e):
            status_code = 403 if "not authorized" in e else 404
            return {"err": e}, status_code

@bp.post("<parking_space_id>/verify")
@require_logged_in_user
def verify_spot_route(
    parking_space_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    spot_id = uuid.UUID(parking_space_id)
    image_file = request.files.get("image")
    match handle_submit_verification(user_id=user_id, parking_space_id=spot_id, image_file=image_file):
        case Ok():
            return {}, 200
        case Err(_):
            return {}, 400
@bp.post("<parking_space_id>/rate")
@require_logged_in_user
def rate_parking_space_route(
    parking_space_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    data = request.json or {}
    availability_rating = data.get("availability_rating")
    cleanliness_rating = data.get("cleanliness_rating")

    result = submit_rating(
        user_id=user_id,
        parking_space_id=uuid.UUID(parking_space_id),
        availability_rating=availability_rating,
        cleanliness_rating=cleanliness_rating,
    )

    if result.is_ok():
        return {}, 200
    else:
        return {"err": result.unwrap_err()}, 400