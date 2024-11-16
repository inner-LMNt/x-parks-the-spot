import uuid
from typing import Dict, Any, List
from psycopg.rows import dict_row

from xpark.utils.db import DB
from result import Result, Ok, Err


def verify_state(state: str) -> bool:
    return state in [
        "AK",
        "AL",
        "AR",
        "AZ",
        "CA",
        "CO",
        "CT",
        "DC",
        "DE",
        "FL",
        "GA",
        "GU",
        "HI",
        "IA",
        "ID",
        "IL",
        "IN",
        "KS",
        "KY",
        "LA",
        "MA",
        "MD",
        "ME",
        "MH",
        "MI",
        "MN",
        "MO",
        "MP",
        "MS",
        "MT",
        "NC",
        "ND",
        "NE",
        "NH",
        "NJ",
        "NM",
        "NV",
        "NY",
        "OH",
        "OK",
        "OR",
        "PA",
        "PR",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VA",
        "VI",
        "VT",
        "WA",
        "WI",
        "WV",
        "WY",
    ]


def get_user_cars(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, make, model, license_plate, license_plate_state, created_at, updated_at, color FROM cars WHERE user_id = %s",
                (user_id,),
            )
            return Ok(cur.fetchall())


def add_car_info(
    user_id: uuid.UUID,
    make: str,
    model: str,
    license_plate: str,
    license_plate_state: str,
    color: str | None = None,
) -> Result[Dict[str, Any], str]:
    # FIXME: Validate license_plate format

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Check if the user already has a car with the same license plate
            cur.execute(
                "SELECT COUNT(*) FROM cars WHERE user_id = %s AND license_plate = %s",
                (user_id, license_plate),
            )
            # we know count will always return, so ignore the null check
            count = cur.fetchone()["count"]  # type: ignore

            if count > 0:
                return Err("A car with this license plate already exists.")

            # Insert the new car
            cur.execute(
                "INSERT INTO cars (user_id, make, model, license_plate, license_plate_state, color, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW()) "
                "RETURNING id, make, model, license_plate, license_plate_state, color, created_at, updated_at",
                (user_id, make, model, license_plate, license_plate_state, color),
            )
            new_car = cur.fetchone()
            if not new_car:
                return Err("Car not created")

            # Already a dict
            return Ok(new_car)


def get_car_info(car_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, make, model, license_plate, license_plate_state, created_at, updated_at, color
                FROM cars WHERE id = %s
                """,
                (car_id,),
            )
            car = cur.fetchone()

            if not car:
                return Err("Car not found")

            return Ok(car)


def update_car(
    user_id: uuid.UUID,
    car_id: uuid.UUID,
    make: str | None = None,
    model: str | None = None,
    license_plate: str | None = None,
    license_plate_state: str | None = None,
    color: str | None = None
) -> Result[Dict[Any, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Check if the car exists and belongs to the user
            cur.execute(
                "SELECT user_id FROM cars WHERE id = %s",
                (car_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("Car not found.")
            if result["user_id"] != user_id:
                return Err("User not authorized to update this car.")

            # If updating license_plate, ensure it's unique
            if license_plate:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM cars
                    WHERE license_plate = %s AND license_plate_state = %s AND id != %s
                    """,
                    (license_plate, license_plate_state, car_id),
                )
                count = cur.fetchone()["count"]  # type: ignore
                if count > 0:
                    return Err("Another car with this license plate already exists.")

            # The coalesce will only update the value if the parameter is not NULL
            cur.execute(
                """
                UPDATE cars SET
                make = COALESCE(%s, make),
                model = COALESCE(%s, model),
                license_plate = COALESCE(%s, license_plate),
                license_plate_state = COALESCE(%s, license_plate_state),
                color = COALESCE(%s, color),
                updated_at = NOW()
                WHERE id = %s
                RETURNING id, make, model, license_plate, created_at, updated_at
                """,
                (make, model, license_plate, license_plate_state, color, car_id),
            )
            updated_car = cur.fetchone()
            if not updated_car:
                return Err("Error updating car")

            return Ok(updated_car)


def delete_car(user_id: uuid.UUID, car_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the car exists and belongs to the user
            cur.execute(
                "SELECT user_id FROM cars WHERE id = %s AND user_id = %s",
                (car_id, user_id),
            )
            result = cur.fetchone()
            if not result:
                return Err("Car not found")

            # Check if the car is associated with any active reservations
            # FIXME
            cur.execute(
                """
                SELECT COUNT(*)
                FROM reservations
                WHERE car_info_id = %s AND status = 'booked'
                """,
                (car_id,),
            )
            (count,) = cur.fetchone()  # type: ignore
            if count > 0:
                return Err("Cannot delete car associated with active reservations")

            # Delete the car
            cur.execute(
                """
                DELETE FROM cars
                WHERE id = %s
                """,
                (car_id,),
            )

            return Ok(None)
