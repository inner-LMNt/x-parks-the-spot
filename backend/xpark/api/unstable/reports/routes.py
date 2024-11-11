from datetime import datetime, timezone
from typing import Any, Tuple
from uuid import UUID

from flask import jsonify, request
from result import Ok, Err

from . import bp
from xpark.logic.parkingspace import save_image
from xpark.logic.reports import (
    create_damage_report_logic,
    create_other_issue_report_logic,
    create_renter_overstay_report_logic,
    create_reservation_issue_report_logic,
    get_report_by_id_logic,
    get_user_reports_logic,
    update_report_admin_response_logic,
)
from xpark.middleware.token_auth_middleware import require_logged_in_user

@bp.route("", methods=["GET"])
@require_logged_in_user
def get_user_reports(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Get all reports for the authenticated user.
    """
    match get_user_reports_logic(user_id):
        case Ok(reports):
            return jsonify(reports), 200


@bp.route('reservation-issue', methods=['POST'])
@require_logged_in_user
def create_reservation_issue_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new reservation issue report.
    """
    reservation_id = request.form.get("reservation_id")
    description = request.form.get("description")
    report_type = "Reservation Issue"

    match create_reservation_issue_report_logic(
        user_id, UUID(reservation_id), report_type, description
    ):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            return jsonify({"error": e}), 400


@bp.route('renter-overstay', methods=['POST'])
@require_logged_in_user
def create_renter_overstay_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new renter overstay report.
    """
    description = request.form.get("description")
    owner_reservation_id = request.form.get("owner_reservation_id")
    departure_time_str = request.form.get("departure_time")
    image = request.files.get("image")
    report_type = "Renter Overstay"

    image_url = save_image(image)  # Implement this function to save the image and return its URL

    # Parse departure_time and make it timezone-aware (assuming UTC)
    departure_time = datetime.fromisoformat(departure_time_str)
    if departure_time.tzinfo is None:
        departure_time = departure_time.replace(tzinfo=timezone.utc)

    match create_renter_overstay_report_logic(
        user_id,
        UUID(owner_reservation_id),
        report_type,
        description,
        departure_time,
        image_url
    ):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            return jsonify({"error": e}), 400


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

    image_url = save_image(image)  # Implement this function to save the image and return its URL

    match create_damage_report_logic(
        user_id,
        UUID(owner_reservation_id),
        report_type,
        description,
        damage_type,
        damage_severity,
        image_url
    ):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            return jsonify({"error": e}), 400


@bp.route('other-issue', methods=['POST'])
@require_logged_in_user
def create_other_issue_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new other issue report.
    """
    description = request.form.get("description")
    report_type = "Other"

    match create_other_issue_report_logic(user_id, report_type, description):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            return jsonify({"error": e}), 400


@bp.route("/<report_id>", methods=["GET"])
@require_logged_in_user
def get_report(report_id: str, token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Get a specific report by ID.
    """
    report_uuid = UUID(report_id)

    match get_report_by_id_logic(report_uuid, user_id):
        case Ok(report):
            return jsonify(report), 200
        case Err(e):
            if e == "Report not found.":
                return jsonify({"error": "Report not found"}), 404
            else:
                return jsonify({"error": e}), 400


@bp.route("/<report_id>", methods=["PUT"])
@require_logged_in_user
def update_report_admin_response(report_id: str, token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Update a report's admin response.
    """
    report_uuid = UUID(report_id)

    data = request.get_json()

    admin_response = data.get("admin_response")

    match update_report_admin_response_logic(report_uuid, admin_response, user_id):
        case Ok(report):
            return jsonify(report), 200
        case Err(e):
            if e == "Report not found or not authorized to update.":
                return jsonify({"error": "Report not found or unauthorized"}), 404
            else:
                return jsonify({"error": e}), 400
