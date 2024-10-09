from xpark.logic.cars import (
    get_user_cars,
    add_car_info,
    update_car_info_logic,
    delete_car_info_logic,
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
    """
    Fetch current user's car information.
    """
    match get_user_cars(user_id):
        case Ok(cars):
            return cars, 200
        case Err(e):
            return {"err": str(e)}, 500


@bp.post("")
@require_logged_in_user
def add_car_info_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Add new car information.
    """
    data = request.get_json()
    if not data:
        return {"err": "Invalid input"}, 400

    match add_car_info(user_id, data):
        case Ok(car_info):
            return car_info, 201
        case Err(e):
            if "not authorized" in str(e):
                return {"error": str(e)}, 403
            else:
                return {"error": str(e)}, 400


@bp.patch("<car_id>")
@require_logged_in_user
def update_car_info_route(
    car_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Update a car's information.
    """
    data = request.get_json()
    if not data:
        return {"error": "Invalid input"}, 400

    try:
        car_uuid = uuid.UUID(car_id)
    except ValueError:
        return {"error": "Invalid car ID"}, 400

    match update_car_info_logic(user_id, car_uuid, data):
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
def delete_car_info_route(
    car_id: str, token: str, user_id: uuid.UUID
) -> Tuple[Any, int]:
    """
    Delete a car.
    """
    try:
        car_uuid = uuid.UUID(car_id)
    except ValueError:
        return {"error": "Invalid car ID"}, 400

    match delete_car_info_logic(user_id, car_uuid):
        case Ok(_):
            return {"message": "Car deleted successfully."}, 200
        case Err(e):
            if "not authorized" in str(e):
                return {"error": str(e)}, 403
            elif "not found" in str(e):
                return {"error": str(e)}, 404
            else:
                return {"error": str(e)}, 400
