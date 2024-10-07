import uuid
from typing import List, Dict, Any, Optional
from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime
import json

def search_parking_space(
    latitude: float,
    longitude: float,
    radius_meters: int,
    filters: Dict[str, Any]
) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                # Start building the query
                query = """
                    SELECT id, name, ST_X(location::geometry) AS longitude, ST_Y(location::geometry) AS latitude,
                           features, is_paid
                    FROM parking_spaces
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

                # Dynamic filters
                where_clauses = []
                for key, value in filters.items():
                    if key == 'paid_status':
                        if value == 'PAID':
                            where_clauses.append("is_paid = TRUE")
                        elif value == 'FREE':
                            where_clauses.append("is_paid = FALSE")
                        # If 'ALL', no filter is added
                    elif key == 'features':
                        where_clauses.append("features @> %(features)s::text[]")
                        params['features'] = value
                    elif key == 'available_from' or key == 'available_to':
                        # Handle availability filters
                        availability_clause, availability_params = handle_availability_filter(
                            filters.get('available_from'),
                            filters.get('available_to')
                        )
                        if availability_clause:
                            where_clauses.append(availability_clause)
                            params.update(availability_params)
                        # No need to process 'available_to' separately
                    else:
                        # For any other fields, add a generic filter
                        where_clauses.append(f"{key} = %({key})s")
                        params[key] = value

                # Append dynamic where clauses
                if where_clauses:
                    query += " AND " + " AND ".join(where_clauses)

                # Execute the query
                cur.execute(query, params)
                results = cur.fetchall()

                # Prepare the response
                parking_spaces = []
                for row in results:
                    id, name, longitude, latitude, features, is_paid = row
                    parking_space = {
                        "id": str(id),
                        "name": name,
                        "location": {
                            "latitude": latitude,
                            "longitude": longitude,
                        },
                        "features": features,
                        "is_paid": is_paid,
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
