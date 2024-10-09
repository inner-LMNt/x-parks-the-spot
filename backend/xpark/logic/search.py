from typing import List, Dict, Any, Optional
from xpark.utils.db import DB
from result import Result, Ok

from typing import List, Dict, Any, Optional
from xpark.utils.db import DB
from result import Result, Ok
import logging


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def search_parking_space(
    latitude: float, longitude: float, radius_meters: int, filters: Dict[str, Any]
) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Initialize query components
            select_fields = [
                "parking_spaces.id",
                "parking_spaces.name",
                "ST_X(parking_spaces.location::geometry) AS longitude",
                "ST_Y(parking_spaces.location::geometry) AS latitude",
                "parking_spaces.address",
                "parking_spaces.features",
            ]

            from_clause = "FROM parking_spaces"

            join_clauses = []
            where_clauses = [
                "ST_DWithin(parking_spaces.location, ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326), %(radius_meters)s)"
            ]

            group_by = "parking_spaces.id"

            # Identify if review-related filters are present
            review_filters = {"average_rating_min", "average_rating_max"}
            has_review_filters = any(key in filters for key in review_filters)

            if has_review_filters:
                # Include reviews table
                join_clauses.append(
                    "LEFT JOIN reviews r ON parking_spaces.id = r.parking_space_id"
                )
                select_fields.append("COALESCE(AVG(r.rating), 0) AS average_rating")

            # Identify if availability-related filters are present
            availability_filters = {"available_from", "available_to"}
            has_availability_filters = any(
                key in filters for key in availability_filters
            )

            if has_availability_filters:
                # Include availability_schedules table
                # Assuming 'availability_schedules' table has 'parking_space_id', 'start_time', 'end_time'
                join_clauses.append(
                    "LEFT JOIN availability_schedules a ON parking_spaces.id = a.parking_space_id"
                )
                select_fields.append(
                    """
                    EXISTS (
                        SELECT 1 
                        FROM availability_schedules AS a_inner 
                        WHERE a_inner.parking_space_id = parking_spaces.id 
                          AND a_inner.start_time <= NOW() 
                          AND a_inner.end_time > NOW()
                    ) AS availability
                """
                )

            # Handle 'paid_status' filter
            paid_status = filters.get("paid_status")
            if paid_status:
                if paid_status == "PAID":
                    where_clauses.append("parking_spaces.is_paid = TRUE")
                elif paid_status == "FREE":
                    where_clauses.append("parking_spaces.is_paid = FALSE")
                # 'ALL' does not add any condition

            # Build the base query
            query = "SELECT " + ", ".join(select_fields) + " " + from_clause

            if join_clauses:
                query += " " + " ".join(join_clauses)

            query += " WHERE " + " AND ".join(where_clauses)

            query += " GROUP BY " + group_by

            # Handle HAVING clause for aggregate functions
            having_clauses = []
            if has_review_filters:
                if "average_rating_min" in filters:
                    having_clauses.append(
                        "COALESCE(AVG(r.rating), 0) >= %(average_rating_min)s"
                    )
                if "average_rating_max" in filters:
                    having_clauses.append(
                        "COALESCE(AVG(r.rating), 0) <= %(average_rating_max)s"
                    )

            if has_availability_filters:
                # You can adjust the conditions based on how you want to filter availability
                if "available_from" in filters and "available_to" in filters:
                    having_clauses.append(
                        """
                        EXISTS (
                            SELECT 1 
                            FROM availability_schedules AS a_having 
                            WHERE a_having.parking_space_id = parking_spaces.id 
                              AND a_having.start_time <= %(available_to)s 
                              AND a_having.end_time >= %(available_from)s
                        )
                    """
                    )
                elif "available_from" in filters:
                    having_clauses.append(
                        """
                        EXISTS (
                            SELECT 1 
                            FROM availability_schedules AS a_having 
                            WHERE a_having.parking_space_id = parking_spaces.id 
                              AND a_having.end_time >= %(available_from)s
                        )
                    """
                    )
                elif "available_to" in filters:
                    having_clauses.append(
                        """
                        EXISTS (
                            SELECT 1 
                            FROM availability_schedules AS a_having 
                            WHERE a_having.parking_space_id = parking_spaces.id 
                              AND a_having.start_time <= %(available_to)s
                        )
                    """
                    )

            if having_clauses:
                query += " HAVING " + " AND ".join(having_clauses)

            # Prepare query parameters
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "radius_meters": radius_meters,
            }

            if has_review_filters:
                if "average_rating_min" in filters:
                    params["average_rating_min"] = filters["average_rating_min"]
                if "average_rating_max" in filters:
                    params["average_rating_max"] = filters["average_rating_max"]

            if has_availability_filters:
                if "available_from" in filters:
                    # Assuming the incoming date-time strings are in ISO format
                    params["available_from"] = filters["available_from"]
                if "available_to" in filters:
                    params["available_to"] = filters["available_to"]

            # Debugging: Log the final query and parameters
            logger.debug("Executing query: %s", query)
            logger.debug("With parameters: %s", params)

            # Execute the query
            cur.execute(query, params)
            results = cur.fetchall()

            # Determine column indices based on whether average_rating and availability are included
            columns = [desc[0] for desc in cur.description]
            id_idx = columns.index("id")
            name_idx = columns.index("name")
            longitude_idx = columns.index("longitude")
            latitude_idx = columns.index("latitude")
            address_idx = columns.index("address")
            features_idx = columns.index("features")

            # Initialize indices for optional fields
            average_rating_present = "average_rating" in columns
            availability_present = "availability" in columns

            if average_rating_present:
                average_rating_idx = columns.index("average_rating")
            if availability_present:
                availability_idx = columns.index("availability")

            # Process results
            parking_spaces = []
            for row in results:
                parking_space = {
                    "id": str(row[id_idx]),
                    "name": row[name_idx],
                    "location": {
                        "latitude": row[latitude_idx],
                        "longitude": row[longitude_idx],
                        "address": row[address_idx],
                    },
                    "features": row[features_idx],
                }

                if average_rating_present:
                    parking_space["average_rating"] = (
                        float(row[average_rating_idx])
                        if row[average_rating_idx] is not None
                        else None
                    )

                if availability_present:
                    parking_space["availability"] = row[availability_idx]

                parking_spaces.append(parking_space)

            return Ok(parking_spaces)


def handle_availability_filter(
    available_from: Optional[str], available_to: Optional[str]
) -> (Optional[str], Dict[str, Any]):
    params = {}
    clauses = []

    if available_from and available_to:
        clauses.append(
            """
            EXISTS (
                SELECT 1 FROM jsonb_array_elements(availability_schedule) AS elem
                WHERE (elem->>'from')::timestamp <= %(available_to)s::timestamp
                AND (elem->>'to')::timestamp >= %(available_from)s::timestamp
            )
        """
        )
        params["available_from"] = available_from
        params["available_to"] = available_to
    elif available_from:
        clauses.append(
            """
            EXISTS (
                SELECT 1 FROM jsonb_array_elements(availability_schedule) AS elem
                WHERE (elem->>'to')::timestamp >= %(available_from)s::timestamp
            )
        """
        )
        params["available_from"] = available_from
    elif available_to:
        clauses.append(
            """
            EXISTS (
                SELECT 1 FROM jsonb_array_elements(availability_schedule) AS elem
                WHERE (elem->>'from')::timestamp <= %(available_to)s::timestamp
            )
        """
        )
        params["available_to"] = available_to

    if clauses:
        return " AND ".join(clauses), params
    else:
        return None, {}
