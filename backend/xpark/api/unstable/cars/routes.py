from xpark.logic.cars import (
    get_user_cars,
    add_car_info,
    update_car,
    delete_car,
)
from . import bp
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.get("")
@require_logged_in_user
def get_user_cars_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_user_cars(user_id):
        case Ok(cars):
            return cars, 200
        case Err(e):
            return {"err": str(e)}, 500


@bp.post("")
@require_logged_in_user
def add_car_info_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    assert request.json
    match add_car_info(
        user_id,
        make=request.json["make"],
        model=request.json["model"],
        license_plate=request.json["license_plate"],
    ):
        case Ok(car_info):
            return car_info, 201
        case Err(e):
            if "not authorized" in str(e):
                return {"error": str(e)}, 403
            else:
                return {"error": str(e)}, 400


@bp.patch("<car_id>")
@require_logged_in_user
def update(car_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    car_uuid = uuid.UUID(car_id)

    # For typing, we already know it exists
    assert request.json

    # We're using .get here because we actually don't care if the value is null
    match update_car(
        user_id,
        car_uuid,
        make=request.json.get("make"),
        model=request.json.get("model"),
        license_plate=request.json.get("license_plate"),
    ):
        case Ok(car_info):
            return car_info, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"error": str(e)}, 403
            elif "not found" in str(e):
                return {"error": str(e)}, 404
            else:
                return {"error": str(e)}, 400


@bp.delete("<car_id>")
@require_logged_in_user
def delete(car_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    car_uuid = uuid.UUID(car_id)

    match delete_car(user_id, car_uuid):
        case Ok(_):
            return {"message": "Car deleted successfully."}, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"error": str(e)}, 403
            elif "not found" in str(e):
                return {"error": str(e)}, 404
            else:
                return {"error": str(e)}, 400
