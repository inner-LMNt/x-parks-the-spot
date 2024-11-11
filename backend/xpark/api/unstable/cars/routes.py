from xpark.logic.cars import (
    get_user_cars,
    add_car_info,
    update_car,
    delete_car,
    get_car_info,
    verify_state,
)
from . import bp
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.get("")
@require_logged_in_user
def get(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_user_cars(user_id):
        case Ok(cars):
            return cars, 200
        case Err(e):
            return {"err": e}, 500


@bp.get("<car_id>")
@require_logged_in_user
def get_car(car_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_car_info(car_id=uuid.UUID(car_id)):
        case Ok(car):
            return car, 200
        case Err(e):
            return {"err": e}, 500


@bp.post("")
@require_logged_in_user
def create(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    assert request.json
    if not verify_state(request.json["license_plate_state"]):
        return {"err", "Invalid state"}, 400
    match add_car_info(
        user_id,
        make=request.json["make"],
        model=request.json["model"],
        license_plate=request.json["license_plate"],
        license_plate_state=request.json["license_plate_state"],
        color=request.json.get("color")
    ):
        case Ok(car_info):
            return car_info, 201
        case Err(e):
            return {"err": e}, 500


@bp.patch("<car_id>")
@require_logged_in_user
def patch(car_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    car_uuid = uuid.UUID(car_id)

    # For typing, we already know it exists
    assert request.json

    if request.json.get("license_plate_state") and not verify_state(
        request.json["license_plate_state"]
    ):
        return {"err", "Invalid state"}, 400

    # We're using .get here because we actually don't care if the value is null
    match update_car(
        user_id,
        car_uuid,
        make=request.json.get("make"),
        model=request.json.get("model"),
        license_plate=request.json.get("license_plate"),
        license_plate_state=request.json.get("license_plate_state"),
        color=request.json.get("color")
    ):
        case Ok(car_info):
            return car_info, 200
        case Err(e):
            if "not authorized" in e:
                return {"err": e}, 403
            elif "not found" in e:
                return {"err": e}, 404
            else:
                return {"err": e}, 400


@bp.delete("<car_id>")
@require_logged_in_user
def delete(car_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    car_uuid = uuid.UUID(car_id)

    match delete_car(user_id, car_uuid):
        case Ok(_):
            return {"message": "Car deleted successfully."}, 200
        case Err(e):
            if "not authorized" in e:
                return {"err": e}, 403
            elif "not found" in e:
                return {"err": e}, 404
            else:
                return {"err": e}, 400
