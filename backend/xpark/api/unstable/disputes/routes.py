from xpark.logic.disputes import (
    get_all_disputes,
    add_dispute,
    resolve_dispute,
)
from . import bp
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid

# Get all disputes for a specific user
@bp.get("")
@require_logged_in_user
def get_user_disputes_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_all_disputes():
            case Ok(disputes):
                return {"disputes": disputes}, 200
            case Err(e):
                return {"error": str(e)}, 500

# Create a new dispute
@bp.post("")
@require_logged_in_user
def add_dispute_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    assert request.json
    dispute_type = request.json.get("dispute_type")
    message = request.json.get("message")
    parking_space_id = request.json.get("parking_space_id")

    match add_dispute(
        user_id=user_id,
        dispute_type=dispute_type,
        message=message,
        parking_space_id=uuid.UUID(parking_space_id) if parking_space_id else None
    ):
        case Ok(dispute):
            return dispute, 201
        case Err(e):
            return {"error": str(e)}, 400

# Respond to a dispute by updating its status to resolved
@bp.patch("<dispute_id>")
@require_logged_in_user
def resolve_dispute_route(dispute_id: str, token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match resolve_dispute(uuid.UUID(dispute_id)):
        case Ok(dispute):
            return dispute, 200
        case Err(e):
            if "not found" in str(e):
                return {"error": str(e)}, 404
            else:
                return {"error": str(e)}, 400
