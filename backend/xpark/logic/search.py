import uuid
from typing import List, Dict, Any, Optional
from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime
import json

import uuid
from typing import List, Dict, Any, Optional
from xpark.utils.db import DB
from result import Result, Ok, Err

def search_parking_space(
    latitude: float,
    longitude: float,
    radius_meters: int,
    filters: Dict[str, Any]
) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                query = """
                    SELECT id, name, ST_X(location::geometry) AS longitude, ST_Y(location::geometry) AS latitude,
                           address, features, COALESCE(AVG(r.rating), 0) as average_rating,
                           EXISTS (
                               SELECT 1 FROM availability_schedules as a
                               WHERE a.parking_space_id = parking_spaces.id
                               AND a.start_time <= NOW() AND a.end_time > NOW()
                           ) as availability
                    FROM parking_spaces
                    LEFT JOIN reviews r ON parking_spaces.id = r.parking_space_id
                    WHERE ST_DWithin(
                        location,
                        ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326),
                        %(radius_meters)s
                    )
                """
                params = {
                    'latitude': latitude,
                    'longitude': longitude,
                    'radius_meters': radius_meters
                }

                if 'paid_status' in filters:
                    if filters['paid_status'] == 'PAID':
                        query += " AND is_paid = TRUE"
                    elif filters['paid_status'] == 'FREE':
                        query += " AND is_paid = FALSE"

                query += " GROUP BY parking_spaces.id"

                cur.execute(query, params)
                results = cur.fetchall()

                parking_spaces = []
                for row in results:
                    id, name, longitude, latitude, address, features, average_rating, availability = row
                    parking_space = {
                        "id": str(id),
                        "name": name,
                        "location": {
                            "latitude": latitude,
                            "longitude": longitude,
                            "address": address
                        },
                        "features": features,
                        "average_rating": float(average_rating) if average_rating is not None else None,
                        "availability": availability
                    }
                    parking_spaces.append(parking_space)

                return Ok(parking_spaces)

            except Exception as e:
                return Err(str(e))
def handle_availability_filter(
    available_from: Optional[str],
    available_to: Optional[str]
) -> (Optional[str], Dict[str, Any]):
    params = {}
    clauses = []

    if available_from and available_to:
        clauses.append("""
            EXISTS (
                SELECT 1 FROM jsonb_array_elements(availability_schedule) AS elem
                WHERE (elem->>'from')::timestamp <= %(available_to)s::timestamp
                AND (elem->>'to')::timestamp >= %(available_from)s::timestamp
            )
        """)
        params['available_from'] = available_from
        params['available_to'] = available_to
    elif available_from:
        clauses.append("""
            EXISTS (
                SELECT 1 FROM jsonb_array_elements(availability_schedule) AS elem
                WHERE (elem->>'to')::timestamp >= %(available_from)s::timestamp
            )
        """)
        params['available_from'] = available_from
    elif available_to:
        clauses.append("""
            EXISTS (
                SELECT 1 FROM jsonb_array_elements(availability_schedule) AS elem
                WHERE (elem->>'from')::timestamp <= %(available_to)s::timestamp
            )
        """)
        params['available_to'] = available_to

    if clauses:
        return " AND ".join(clauses), params
    else:
        return None, {}