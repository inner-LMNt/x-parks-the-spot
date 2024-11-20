from datetime import datetime, timezone
from typing import Any, Tuple
from uuid import UUID
from werkzeug.datastructures import FileStorage

from flask import jsonify, request
from result import Ok, Err

from . import bp
from xpark.utils.s3 import S3
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
        case _:
            return jsonify(
                {"error": "Unknown error"}
            ), 400  # Added return for missing case


@bp.route("reservation-issue", methods=["POST"])
@require_logged_in_user
def create_reservation_issue_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new reservation issue report.
    """
    reservation_id = request.form.get("reservation_id")
    description = request.form.get("description")
    report_type = "Reservation Issue"

    # Type assertions
    assert description is not None

    match create_reservation_issue_report_logic(
        user_id, UUID(reservation_id), report_type, description
    ):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            if "not found" in e:
                return jsonify({"error": e}), 404
            return jsonify({"error": e}), 400


@bp.route("renter-overstay", methods=["POST"])
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

    assert isinstance(image, FileStorage)
    assert description is not None
    assert departure_time_str is not None

    image_url = S3.save_image(image)

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
        image_url,
    ):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            if "not found" in e:
                return jsonify({"error": e}), 404
            return jsonify({"error": e}), 400


@bp.route("damage-report", methods=["POST"])
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

    # Type assertions
    assert isinstance(image, FileStorage)
    assert description is not None
    assert damage_type is not None
    assert damage_severity is not None

    image_url = S3.save_image(image)

    match create_damage_report_logic(
        user_id,
        UUID(owner_reservation_id),
        report_type,
        description,
        damage_type,
        damage_severity,
        image_url,
    ):
        case Ok(report):
            return jsonify(report), 201
        case Err(e):
            if "not found" in e:
                return jsonify({"error": e}), 404
            return jsonify({"error": e}), 400


@bp.route("other-issue", methods=["POST"])
@require_logged_in_user
def create_other_issue_report(token: str, user_id: UUID) -> Tuple[Any, int]:
    """
    Create a new other issue report.
    """
    description = request.form.get("description")
    report_type = "Other"

    # Type assertion
    assert description is not None

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
            return jsonify({"error": e}), 400


@bp.route("/<report_id>", methods=["PUT"])
@require_logged_in_user
def update_report_admin_response(
    report_id: str, token: str, user_id: UUID
) -> Tuple[Any, int]:
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
