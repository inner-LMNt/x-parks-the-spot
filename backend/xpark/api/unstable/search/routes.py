from xpark import Config
from . import bp
from xpark.logic.search import search_parking_space
from flask import request
from result import Ok, Err
from typing import Tuple, Any

@bp.post("")
def search_parking_spaces_route() -> Tuple[Any, int]:
    # Extract required parameters
    try:
        latitude = float(request.args.get('latitude'))
        longitude = float(request.args.get('longitude'))
    except (TypeError, ValueError):
        return {'error': 'Latitude and longitude are required and must be valid numbers'}, 400

    # Extract optional parameters
    radius = request.args.get('radius', default=5.0, type=float)
    radius_meters = round(min(radius, Config.MAX_SEARCH_RADIUS_KM) * 1000)  # Convert km to meters and cap

    # Prepare filters
    paid_status = request.args.get('paid_status', default='ALL').upper()
    if paid_status not in {'ALL', 'PAID', 'FREE'}:
        return {'error': 'Invalid value for paid_status. Must be ALL, PAID, or FREE.'}, 400

    filters = {
        'paid_status': paid_status,
        'features': request.args.getlist('features'),
        'available_from': request.args.get('available_from'),
        'available_to': request.args.get('available_to'),
    }

    # Remove None values and empty lists
    filters = {k: v for k, v in filters.items() if v}

    # Call the logic function
    match search_parking_space(latitude, longitude, radius_meters, filters):
        case Ok(parking_spaces):
            return parking_spaces, 200
        case Err(e):
            return {'error': str(e)}, 400
