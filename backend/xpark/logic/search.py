from typing import Any

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
) -> list[dict[str, Any]]:
    paid = None
    if paid_status == "PAID":
        paid = True
    elif paid_status == "UNPAID":
        paid = False

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    is_paid, 
                    verification_status, 
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
                LIMIT 30
                """,
                {
                    "long": long,
                    "lat": lat,
                    "radius_meters": radius_meters,
                    "paid": paid,
                    "min_price": min_price,
                    "max_price": max_price,
                },
            )
            parking_spaces = cur.fetchall()
            for parking_space in parking_spaces:
                parking_space["location"] = {
                    "latitude": parking_space["latitude"],
                    "longitude": parking_space["longitude"],
                    "address": parking_space["address"],
                }
                del parking_space["latitude"]
                del parking_space["longitude"]
                del parking_space["address"]

            return parking_spaces
