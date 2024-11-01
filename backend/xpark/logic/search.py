from typing import Any, Optional

from psycopg.rows import dict_row

from xpark.utils.db import DB


from datetime import datetime, timezone

def search_query(
    lat: float,
    long: float,
    radius_meters: float,
    paid_status: str,
    min_price: float,
    max_price: float,
    start_time: str,
    end_time: str,
    is_taken: Optional[bool] = False
) -> list[dict[str, Any]]:
    paid = None
    if paid_status == "PAID":
        paid = True
    elif paid_status == "UNPAID":
        paid = False
    if is_taken:
        is_taken = None

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    is_paid,
                    verification_status,
                    is_taken,
                    name,
                    ST_Y(location::geometry) AS latitude,
                    ST_X(location::geometry) AS longitude,
                    address,
                    photos,
                    created_at,
                    updated_at,
                    json_build_object(
                        'base_price', price,
                        'dynamic_pricing', FALSE
                    ) as pricing_info,
                    availability_schedule,
                    CASE WHEN is_paid THEN COALESCE(avg_availability_rating, 0) ELSE NULL END AS avg_availability_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_cleanliness_rating, 0) ELSE NULL END AS avg_cleanliness_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_total_rating, 0) ELSE NULL END AS avg_total_rating,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_availability, 0) ELSE NULL END AS ratings_count_availability,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_cleanliness, 0) ELSE NULL END AS ratings_count_cleanliness
                FROM parking_spaces
                WHERE ST_DWithin(location, ST_MakePoint(%(long)s, %(lat)s), %(radius_meters)s)
                AND is_paid = COALESCE(%(paid)s,is_paid)
                AND price >= COALESCE(%(min_price)s, price)
                AND price <= COALESCE(%(max_price)s, price)
                AND is_taken = COALESCE(%(is_taken)s, is_taken)
                LIMIT 30
                """,
                {
                    "long": long,
                    "lat": lat,
                    "radius_meters": radius_meters,
                    "paid": paid,
                    "min_price": min_price,
                    "max_price": max_price,
                    "is_taken": is_taken
                },
            )
            parking_spaces = cur.fetchall()

            # Calculate elapsed time for each taken spot and update name
            now = datetime.now(timezone.utc)  # Set now to UTC to match the timezone of updated_at
            for parking_space in parking_spaces:
                # Process location data
                parking_space["location"] = {
                    "latitude": parking_space["latitude"],
                    "longitude": parking_space["longitude"],
                    "address": parking_space["address"],
                }
                del parking_space["latitude"]
                del parking_space["longitude"]
                del parking_space["address"]

                # Update name for taken spots
                if parking_space["is_taken"]:
                    updated_at = parking_space["updated_at"]
                    time_diff = now - updated_at

                    # Calculate hours and minutes since last update
                    hours, remainder = divmod(time_diff.total_seconds(), 3600)
                    minutes = remainder // 60

                    if hours > 0:
                        parking_space["name"] = f"Updated {int(hours)} hours ago"
                    elif minutes > 0:
                        parking_space["name"] = f"Updated {int(minutes)} minutes ago"
                    else:
                        parking_space["name"] = "Updated just now"

                # Process ratings
                if parking_space['is_paid']:
                    if (parking_space['ratings_count_availability'] == 0 or
                        parking_space['ratings_count_availability'] is None) and \
                       (parking_space['ratings_count_cleanliness'] == 0 or
                        parking_space['ratings_count_cleanliness'] is None):
                        parking_space['avg_total_rating'] = "unrated"
                    else:
                        parking_space['avg_total_rating'] = float(parking_space['avg_total_rating']) if parking_space['avg_total_rating'] != 0 else "unrated"
                        parking_space['avg_availability_rating'] = float(parking_space['avg_availability_rating']) if parking_space['avg_availability_rating'] != 0 else None
                        parking_space['avg_cleanliness_rating'] = float(parking_space['avg_cleanliness_rating']) if parking_space['avg_cleanliness_rating'] != 0 else None

            return parking_spaces