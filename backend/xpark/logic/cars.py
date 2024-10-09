# xpark/logic/cars.py

import uuid
from typing import Dict, Any, List

from xpark.utils.db import DB
from result import Result, Ok, Err


def get_user_cars(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    """
    Fetch user's car information from the database.
    """
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
                    id, 
                    make, 
                    model, 
                    license_plate,
                    created_at,
                    updated_at
                FROM cars
                WHERE user_id = %s
                """,
                (str(user_id),),
            )
            rows = cur.fetchall()

            col_names = [desc[0] for desc in cur.description]

            cars = []
            for row in rows:
                row_dict = dict(zip(col_names, row))
                car = {
                    "id": str(row_dict["id"]),
                    "make": row_dict["make"],
                    "model": row_dict["model"],
                    "license_plate": row_dict["license_plate"],
                    "created_at": row_dict["created_at"].isoformat(),
                    "updated_at": row_dict["updated_at"].isoformat(),
                }
                cars.append(car)

            return Ok(cars)


def add_car_info(
    user_id: uuid.UUID, data: Dict[str, Any]
) -> Result[Dict[str, Any], str]:
    """
    Add new car information for the user.
    """
    make = data.get("make")
    model = data.get("model")
    license_plate = data.get("license_plate")

    if not all([make, model, license_plate]):
        return Err("Missing required car information fields.")

    # Optional: Validate license_plate format
    # Add regex or other validation as needed

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the user already has a car with the same license plate
            cur.execute(
                """
                SELECT COUNT(*) 
                FROM cars
                WHERE user_id = %s AND license_plate = %s
                """,
                (str(user_id), license_plate),
            )
            (count,) = cur.fetchone()
            if count > 0:
                return Err("A car with this license plate already exists.")

            # Insert the new car
            car_id = uuid.uuid4()
            cur.execute(
                """
                INSERT INTO cars (
                    id,
                    user_id,
                    make,
                    model,
                    license_plate,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id, make, model, license_plate, created_at, updated_at
                """,
                (str(car_id), str(user_id), make, model, license_plate),
            )
            new_car = cur.fetchone()

            car_data = {
                "id": str(new_car[0]),
                "make": new_car[1],
                "model": new_car[2],
                "license_plate": new_car[3],
                "created_at": new_car[4].isoformat(),
                "updated_at": new_car[5].isoformat(),
            }

            conn.commit()

            return Ok(car_data)


def get_car_info(user_id: uuid.UUID, car_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    """
    Fetch specific car information, ensuring it belongs to the user.
    """
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
                    id, 
                    make, 
                    model, 
                    license_plate,
                    created_at,
                    updated_at
                FROM cars
                WHERE id = %s AND user_id = %s
                """,
                (str(car_id), str(user_id)),
            )
            car = cur.fetchone()
            if not car:
                return Err("Car not found.")

            car_data = {
                "id": str(car[0]),
                "make": car[1],
                "model": car[2],
                "license_plate": car[3],
                "created_at": car[4].isoformat(),
                "updated_at": car[5].isoformat(),
            }

            return Ok(car_data)


def update_car_info_logic(
    user_id: uuid.UUID, car_id: uuid.UUID, updates: Dict[str, Any]
) -> Result[Dict[str, Any], str]:
    """
    Update car information.
    """
    allowed_fields = {"make", "model", "license_plate"}
    set_clauses = []
    values = []

    for key, value in updates.items():
        if key in allowed_fields:
            set_clauses.append(f"{key} = %s")
            values.append(value)

    if not set_clauses:
        return Err("No valid fields to update.")

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the car exists and belongs to the user
            cur.execute(
                """
                SELECT user_id 
                FROM cars
                WHERE id = %s
                """,
                (str(car_id),),
            )
            result = cur.fetchone()
            if not result:
                return Err("Car not found.")
            (car_owner_id,) = result
            if str(car_owner_id) != str(user_id):
                return Err("User not authorized to update this car.")

            # If updating license_plate, ensure it's unique
            if "license_plate" in updates:
                new_license_plate = updates["license_plate"]
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM cars
                    WHERE license_plate = %s AND id != %s
                    """,
                    (new_license_plate, str(car_id)),
                )
                (count,) = cur.fetchone()
                if count > 0:
                    return Err("Another car with this license plate already exists.")

            # Build and execute the update query
            query = f"""
                UPDATE cars
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, make, model, license_plate, created_at, updated_at
            """
            values.append(str(car_id))
            cur.execute(query, tuple(values))
            updated_car = cur.fetchone()

            car_data = {
                "id": str(updated_car[0]),
                "make": updated_car[1],
                "model": updated_car[2],
                "license_plate": updated_car[3],
                "created_at": updated_car[4].isoformat(),
                "updated_at": updated_car[5].isoformat(),
            }

            conn.commit()

            return Ok(car_data)


def delete_car_info_logic(user_id: uuid.UUID, car_id: uuid.UUID) -> Result[None, str]:
    """
    Delete a car, ensuring it belongs to the user.
    """
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the car exists and belongs to the user
            cur.execute(
                """
                SELECT user_id
                FROM cars
                WHERE id = %s
                """,
                (str(car_id),),
            )
            result = cur.fetchone()
            if not result:
                return Err("Car not found.")
            (car_owner_id,) = result
            if str(car_owner_id) != str(user_id):
                return Err("User not authorized to delete this car.")

            # Check if the car is associated with any active reservations
            cur.execute(
                """
                SELECT COUNT(*)
                FROM reservations
                WHERE car_info_id = %s AND status = 'booked'
                """,
                (str(car_id),),
            )
            (count,) = cur.fetchone()
            if count > 0:
                return Err("Cannot delete car associated with active reservations.")

            # Delete the car
            cur.execute(
                """
                DELETE FROM cars
                WHERE id = %s
                """,
                (str(car_id),),
            )

            conn.commit()

            return Ok(None)
