from flask import request, jsonify
from typing import Tuple, Any
from uuid import UUID
from . import bp
from xpark.logic.reports import (
    get_user_reports_logic,
    create_report_logic,
    get_report_by_id_logic,
    update_report_admin_response_logic
)
from xpark.middleware.token_auth_middleware import require_logged_in_user


@bp.route("", methods=["GET"])
@require_logged_in_user
def get_user_reports(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Get all reports for the authenticated user.
    """
    result = get_user_reports_logic(user_id)
    if result.is_ok():
        return jsonify(result.unwrap()), 200
    else:
        return jsonify({"error": result.unwrap_err()}), 400


@bp.route("", methods=["POST"])
@require_logged_in_user
def create_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new report.
    """
    data = request.get_json()

    reservation_id = data.get("reservation_id")
    description = data.get("description")
    type = data.get("type")

    if not reservation_id or not description:
        return jsonify({"error": "Missing required fields"}), 400

    # Validate UUIDs
    try:
        reservation_uuid = UUID(reservation_id)
    except ValueError:
        return jsonify({"error": "Invalid reservation_id format"}), 400

    result = create_report_logic(user_id, reservation_uuid, type, description)
    if result.is_ok():
        return jsonify(result.unwrap()), 201
    else:
        return jsonify({"error": result.unwrap_err()}), 400


@bp.route("/<report_id>", methods=["GET"])
@require_logged_in_user
def get_report(report_id: str, token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Get a specific report by ID.
    """
    # Validate UUID
    try:
        report_uuid = UUID(report_id)
    except ValueError:
        return jsonify({"error": "Invalid report ID format"}), 400

    result = get_report_by_id_logic(report_uuid, user_id)
    if result.is_ok():
        return jsonify(result.unwrap()), 200
    elif result.unwrap_err() == "Report not found.":
        return jsonify({"error": "Report not found"}), 404
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.route("/<report_id>", methods=["PUT"])
@require_logged_in_user
def update_report_admin_response(report_id: str, token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Update a report's admin response.
    """
    report_uuid = UUID(report_id)

    data = request.get_json()

    admin_response = data.get("admin_response")

    result = update_report_admin_response_logic(report_uuid, admin_response, user_id)
    if result.is_ok():
        return jsonify(result.unwrap()), 200
    elif result.unwrap_err() == "Report not found or not authorized to update.":
        return jsonify({"error": "Report not found or unauthorized"}), 404
    else:
        return jsonify({"error": result.unwrap_err()}), 400

