from datetime import datetime

from xpark.config import Config
from . import bp
from xpark.logic.search import search_parking_space
from flask import request, jsonify
from result import Ok, Err
from typing import Tuple, Any
import logging


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@bp.route("", methods=["POST"])
def search_parking_spaces_route() -> Tuple[Any, int]:
    # Get JSON data from request body
    data = request.json

    if not data:
        logger.error("No data provided in request body")
        return jsonify({"error": "No data provided in request body"}), 400

    # Extract required parameters
    try:
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
    except (TypeError, ValueError):
        logger.error("Latitude and longitude are required and must be valid numbers")
        return (
            jsonify(
                {
                    "error": "Latitude and longitude are required and must be valid numbers"
                }
            ),
            400,
        )

    # Extract optional parameters
    radius = data.get("radius", 5.0)
    try:
        radius = float(radius)
    except ValueError:
        logger.error("Radius must be a valid number")
        return jsonify({"error": "Radius must be a valid number"}), 400

    radius_meters = round(
        min(radius, Config.MAX_SEARCH_RADIUS_KM) * 1000
    )  # Convert km to meters and cap

    # Prepare filters
    filters = {}
    paid_status = data.get("paid_status", "ALL").upper()
    if paid_status not in {"ALL", "PAID", "FREE"}:
        logger.error("Invalid value for paid_status. Must be ALL, PAID, or FREE.")
        return (
            jsonify(
                {"error": "Invalid value for paid_status. Must be ALL, PAID, or FREE."}
            ),
            400,
        )

    if paid_status != "ALL":
        filters["paid_status"] = paid_status

    # Handle additional filters (e.g., reviews and availability)
    # Example: average_rating_min, average_rating_max, available_from, available_to
    average_rating_min = data.get("average_rating_min")
    average_rating_max = data.get("average_rating_max")

    if average_rating_min is not None:
        try:
            filters["average_rating_min"] = float(average_rating_min)
        except ValueError:
            logger.error("average_rating_min must be a valid number")
            return jsonify({"error": "average_rating_min must be a valid number"}), 400

    if average_rating_max is not None:
        try:
            filters["average_rating_max"] = float(average_rating_max)
        except ValueError:
            logger.error("average_rating_max must be a valid number")
            return jsonify({"error": "average_rating_max must be a valid number"}), 400

    # Handle availability filters
    available_from = data.get(
        "available_from"
    )  # Expected in ISO format e.g., "2024-10-10T08:00:00Z"
    available_to = data.get("available_to")  # Expected in ISO format

    if available_from:
        try:
            # Validate the datetime format
            datetime.fromisoformat(available_from.replace("Z", "+00:00"))
            filters["available_from"] = available_from
        except ValueError:
            logger.error("available_from must be a valid ISO 8601 datetime string")
            return (
                jsonify(
                    {"error": "available_from must be a valid ISO 8601 datetime string"}
                ),
                400,
            )

    if available_to:
        try:
            # Validate the datetime format
            datetime.fromisoformat(available_to.replace("Z", "+00:00"))
            filters["available_to"] = available_to
        except ValueError:
            logger.error("available_to must be a valid ISO 8601 datetime string")
            return (
                jsonify(
                    {"error": "available_to must be a valid ISO 8601 datetime string"}
                ),
                400,
            )

    # Call the logic function
    match search_parking_space(latitude, longitude, radius_meters, filters):
        case Ok(parking_spaces):
            return jsonify({"spots": parking_spaces}), 200
        case Err(e):
            logger.error("Error searching parking spaces: %s", str(e))
            return jsonify({"error": str(e)}), 400
