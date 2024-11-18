from . import bp
from xpark.logic.admin import (
    get_all_pending_parking_spaces,
    handle_verify_parking,
    get_all_conflicts,
    update_conflict_response,
    get_all_cancellations,
    handle_acknowledge_cancellation,
    admin_delete_paid_parking_space,
    handle_ban_user,
    fetch_user_details,
)
from flask import request, jsonify
from result import Ok, Err
from typing import Any, Tuple
from xpark.middleware.token_auth_middleware import require_admin
import uuid

@bp.get("users/<user_id>")
def fetch_user_details_route(user_id: str) -> Tuple[Any, int]:
    """
    Fetch details for a specific user
    """
    try:
        # Fetch user details
        result = fetch_user_details(user_uuid)
        if result.is_ok():
            return jsonify(result.unwrap()), 200
        else:
            error_message = result.unwrap_err()
            print(f"[Error] Fetching user details failed for user_id: {user_id}. Reason: {error_message}")
            return jsonify({"error": error_message}), 404
    except Exception as e:
        print(f"[Server Error] Unexpected error occurred: {e}")
        return {"error": "An unexpected error occurred while fetching user details"}, 500


@bp.get("get-conflicts")
@require_admin
def get_conflicts_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Fetch all open conflicts (non-resolved reports)
    """
    result = get_all_conflicts()
    if result.is_ok():
        return jsonify(result.unwrap()), 200
    else:
        return jsonify({"error": result.unwrap_err()}), 400

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

@bp.post("update-conflict")
@require_admin
def update_conflict_response_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Update the response for a specific conflict
    """
    data = request.get_json()
    conflict_id = data.get("id")
    response_text = data.get("response")

    if not conflict_id or not response_text:
        return {"error": "Conflict ID and response text are required"}, 400

    try:
        conflict_uuid = uuid.UUID(conflict_id)
    except ValueError:
        return {"error": "Invalid conflict ID format"}, 400

    result = update_conflict_response(conflict_uuid, response_text)
    if result.is_ok():
        return jsonify(result.unwrap()), 200
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.get("get-cancellations")
@require_admin
def get_cancellations_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Fetch all cancellations
    """
    result = get_all_cancellations()
    if result.is_ok():
        return jsonify(result.unwrap()), 200
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.post("acknowledge-cancellation")
@require_admin
def acknowledge_cancellation_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    """
    Acknowledge a cancellation and remove it from the view
    """
    data = request.get_json()
    cancellation_id = data.get("id")

    if not cancellation_id:
        return {"error": "Cancellation ID is required"}, 400

    try:
        cancellation_uuid = uuid.UUID(cancellation_id)
    except ValueError:
        return {"error": "Invalid cancellation ID format"}, 400

    result = handle_acknowledge_cancellation(cancellation_uuid)
    if result.is_ok():
        return jsonify({"message": "Cancellation acknowledged"}), 200
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.delete("parking-spaces/<parking_space_id>")
@require_admin
def admin_delete_parking_space_route(token: str, user_id: uuid.UUID, parking_space_id: str) -> Tuple[Any, int]:
    """
    Admin route to delete a paid parking space and handle associated reservations
    """
    data = request.get_json()
    reason = data.get("reason")

    if not parking_space_id or not reason:
        return {"error": "Parking space ID and reason are required"}, 400

    match admin_delete_paid_parking_space(uuid.UUID(parking_space_id), reason):
        case Ok(_):
            return {}, 200
        case Err("spot not found"):
            return {"err": "Parking space not found"}, 404
        case Err(e):
            return {"err": str(e)}, 400