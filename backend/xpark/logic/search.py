from typing import Any

from psycopg.rows import dict_row

from xpark.utils.db import DB


from typing import Any
from datetime import datetime, timezone
from psycopg.rows import dict_row
from xpark.utils.db import DB

def search_query(
    lat: float,
    long: float,
    radius_meters: float,
    paid_status: str,
    min_price: float,
    max_price: float,
    start_time: str,
    end_time: str,
    is_taken: bool = False
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
                    availability_schedule
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

            return parking_spaces
