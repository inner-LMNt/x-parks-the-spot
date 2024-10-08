from xpark import Config
from . import bp
from xpark.logic.search import search_parking_space
from flask import request, jsonify
from result import Ok, Err
from typing import Tuple, Any


@bp.route("", methods=["POST"])
def search_parking_spaces_route() -> Tuple[Any, int]:
    # Get JSON data from request body
    data = request.json

    if not data:
        return jsonify({'error': 'No data provided in request body'}), 400

    # Extract required parameters
    try:
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Latitude and longitude are required and must be valid numbers'}), 400

    # Extract optional parameters
    radius = data.get('radius', 5.0)
    try:
        radius = float(radius)
    except ValueError:
        return jsonify({'error': 'Radius must be a valid number'}), 400

    radius_meters = round(min(radius, Config.MAX_SEARCH_RADIUS_KM) * 1000)  # Convert km to meters and cap

    # Prepare filters
    filters = {}
    paid_status = data.get('paid_status', 'ALL').upper()
    if paid_status not in {'ALL', 'PAID', 'FREE'}:
        return jsonify({'error': 'Invalid value for paid_status. Must be ALL, PAID, or FREE.'}), 400

    if paid_status != 'ALL':
        filters['paid_status'] = paid_status

    # Call the logic function
    match search_parking_space(latitude, longitude, radius_meters, filters):
        case Ok(parking_spaces):
            return jsonify({'spots': parking_spaces}), 200
        case Err(e):
            return jsonify({'error': str(e)}), 400