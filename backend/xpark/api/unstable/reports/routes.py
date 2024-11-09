from flask import request, jsonify
from typing import Tuple, Any
from uuid import UUID
from . import bp
from xpark.logic.reports import (
    create_report_logic,
    create_renter_overstay_report_logic,
    create_damage_report_logic,
    create_other_issue_report_logic,
    get_user_reports_logic, get_report_by_id_logic, update_report_admin_response_logic,
)
from xpark.middleware.token_auth_middleware import require_logged_in_user
from xpark.logic.parkingspace import (
    save_image
)
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
@bp.route('reservation-issue', methods=['POST'])
@require_logged_in_user
def create_reservation_issue_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new reservation issue report.
    """

    reservation_id = request.form.get("reservation_id")
    description = request.form.get("description")
    report_type = "Reservation Issue"

    if not reservation_id or not description:
        return jsonify({"error": "Missing required fields"}), 400

    # Validate UUID
    try:
        reservation_uuid = UUID(reservation_id)
    except ValueError:
        return jsonify({"error": "Invalid reservation_id format"}), 400

    result = create_report_logic(user_id, reservation_uuid, report_type, description)
    if result.is_ok():
        return jsonify(result.unwrap()), 201
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.route('renter-overstay', methods=['POST'])
@require_logged_in_user
def create_renter_overstay_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new renter overstay report.
    """
    # Use request.form and request.files for multipart/form-data
    description = request.form.get("description")
    owner_reservation_id = request.form.get("owner_reservation_id")
    departure_time = request.form.get("departure_time")
    overstay_duration = request.form.get("overstay_duration")
    image = request.files.get("image")
    report_type = "Renter Overstay"

    if not owner_reservation_id or not description or not departure_time or not overstay_duration or not image:
        return jsonify({"error": "Missing required fields"}), 400

    # Validate UUID
    try:
        reservation_uuid = UUID(owner_reservation_id)
    except ValueError:
        return jsonify({"error": "Invalid owner_reservation_id format"}), 400

    # Process the image file as needed
    image_url = save_image(image)  # Implement this function to save the image and return its URL

    result = create_renter_overstay_report_logic(
        user_id,
        reservation_uuid,
        report_type,
        description,
        departure_time,
        overstay_duration,
        image_url
    )
    if result.is_ok():
        return jsonify(result.unwrap()), 201
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.route('damage-report', methods=['POST'])
@require_logged_in_user
def create_damage_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new damage report.
    """
    description = request.form.get("description")
    owner_reservation_id = request.form.get("owner_reservation_id")
    damage_type = request.form.get("damage_type")
    damage_severity = request.form.get("damage_severity")
    image = request.files.get("image")
    report_type = "Damage Report"

    if not owner_reservation_id or not description or not damage_type or not damage_severity or not image:
        return jsonify({"error": "Missing required fields"}), 400

    # Validate UUID
    try:
        reservation_uuid = UUID(owner_reservation_id)
    except ValueError:
        return jsonify({"error": "Invalid owner_reservation_id format"}), 400

    # Process the image file as needed
    image_url = save_image(image)  # Implement this function to save the image and return its URL

    result = create_damage_report_logic(
        user_id,
        reservation_uuid,
        report_type,
        description,
        damage_type,
        damage_severity,
        image_url
    )
    if result.is_ok():
        return jsonify(result.unwrap()), 201
    else:
        return jsonify({"error": result.unwrap_err()}), 400

@bp.route('other-issue', methods=['POST'])
@require_logged_in_user
def create_other_issue_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new other issue report.
    """
    data = request.get_json()

    description = data.get("description")
    report_type = "Other"

    if not description:
        return jsonify({"error": "Missing required fields"}), 400

    result = create_other_issue_report_logic(user_id, report_type, description)
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