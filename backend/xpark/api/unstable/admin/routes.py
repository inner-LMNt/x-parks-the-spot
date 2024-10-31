from . import bp
from xpark.logic.admin import (
    get_all_pending_parking_spaces,
    handle_verify_parking,
)
from flask import request
from result import Ok, Err
from typing import Any
from xpark.middleware.token_auth_middleware import require_logged_in_user, require_admin
from typing import Tuple
import uuid

@bp.get("get-pending")
def get_pending_parking_spaces_route() -> Tuple[Any, int]:
    """
    Fetch all parking spaces with a pending verification status
    """
    match get_all_pending_parking_spaces():
        case Ok(pending_spaces):
            return pending_spaces, 200
        case Err(e):
            return {"error": str(e)}, 403

@bp.post("verify-parking-space")
@require_admin
def verify_parking_space(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    # Parse the request JSON body for the spot ID and verification decision
    data = request.get_json()
    spot_id = data.get("spotId")
    is_verified = data.get("is_verified")
    try:
        parking_space_uuid = uuid.UUID(spot_id)
    except ValueError:
        return {"error": "Invalid parking_space_id format"}, 401

    match handle_verify_parking(parking_space_uuid, is_verified):
        case Ok(updated_space):
            return updated_space, 200
        case Err(e):
            return {"error": str(e)}, 400

