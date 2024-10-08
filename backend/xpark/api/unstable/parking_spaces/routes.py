from xpark import Config
from . import bp
from xpark.logic.parkingspace import create_parking_space, get_parking_space, update_parking_space, \
    delete_parking_space, get_owned_parking_spaces
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
    data = request.get_json()
    if not data:
        return {'error': 'Invalid input'}, 400

    # Extract required fields
    try:
        is_paid = data['is_paid']
        location = data['location']  # Should contain 'latitude' and 'longitude'
        latitude = location['latitude']
        longitude = location['longitude']
    except KeyError as e:
        return {'error': f'Missing field: {e}'}, 400

    # Extract optional fields
    name = data.get('name')
    features = data.get('features', [])
    availability_schedule = data.get('availability_schedule', [])
    pricing_info = data.get('pricing_info', {})
    photos = data.get('photos', [])
    verification_status = data.get('verification_status')
    dynamic_pricing_enabled = data.get('dynamic_pricing_enabled', False)
    cancellation_policy = data.get('cancellation_policy')

    match create_parking_space(
        owner_id=user_id,
        is_paid=is_paid,
        name=name,
        latitude=latitude,
        longitude=longitude,
        features=features,
        availability_schedule=availability_schedule,
        pricing_info=pricing_info,
        photos=photos,
        verification_status=verification_status,
        dynamic_pricing_enabled=dynamic_pricing_enabled,
        cancellation_policy=cancellation_policy
    ):
        case Ok(parking_space):
            return parking_space, 201
        case Err(e):
            return {'error': str(e)}, 400

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
