import json

from xpark import Config
from . import bp
from xpark.logic.parkingspace import create_parking_space, get_parking_space, update_parking_space, \
    delete_parking_space, get_owned_parking_spaces, save_image
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.get("")
@require_logged_in_user
def get_owned_parking_spaces_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_owned_parking_spaces(user_id):
        case Ok(data):
            return data, 200
        case Err(e):
            return {'error': str(e)}, 500

@bp.post("")
@require_logged_in_user
def create_parking_space_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    data = request.form.get('data')
    image_file = request.files.get('image')

    result = create_parking_space(user_id=user_id, data=data, image_file=image_file)

    if result.is_ok():
        return result.unwrap(), 201
    else:
        return {'error': result.unwrap_err()}, 400


@bp.get("<parking_space_id>")
def get_parking_space_route(parking_space_id: str) -> Tuple[Any, int]:
    try:
        parking_space_uuid = uuid.UUID(parking_space_id)
    except ValueError:
        return {"error": "Invalid parking space ID"}, 400

    match get_parking_space(parking_space_uuid):
        case Ok(parking_space):
            return parking_space, 200
        case Err(e):
            return {"error": str(e)}, 404

@bp.patch("<parking_space_id>")
@require_logged_in_user
def update_parking_space_route(parking_space_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    data = request.get_json()
    if not data:
        return {'error': 'Invalid input'}, 400

    try:
        parking_space_uuid = uuid.UUID(parking_space_id)
    except ValueError:
        return {"error": "Invalid parking space ID"}, 400

    match update_parking_space(user_id, parking_space_uuid, data):
        case Ok(parking_space):
            return parking_space, 200
        case Err(e):
            status_code = 403 if "not authorized" in str(e) else 404 if "not found" in str(e) else 400
            return {'error': str(e)}, status_code

@bp.delete("<parking_space_id>")
@require_logged_in_user
def delete_parking_space_route(parking_space_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    try:
        parking_space_uuid = uuid.UUID(parking_space_id)
    except ValueError:
        return {"error": "Invalid parking space ID"}, 400

    match delete_parking_space(user_id, parking_space_uuid):
        case Ok(_):
            return {}, 200
        case Err(e):
            status_code = 403 if "not authorized" in str(e) else 404
            return {'error': str(e)}, status_code
