import uuid
from typing import Dict, Any, List
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime
from enum import Enum


class ReservationStatus(Enum):
    book = "book"
    cancel = "cancel"
    complete = "complete"


def get_user_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    id, 
                    parking_space_id, 
                    start_time, 
                    end_time, 
                    car_info_id, 
                    renter_id,
                    status,
                    created_at,
                    updated_at
                FROM reservations
                WHERE renter_id = %s
            """,
                (user_id,),
            )
            return Ok(cur.fetchall())


def create_reservation(
    user_id: uuid.UUID,
    parking_space_uuid: uuid.UUID,
    start_time: str,
    end_time: str,
    car_info_uuid: uuid.UUID,
) -> Result[Dict[str, Any], str]:
    start_dt = datetime.datetime.fromisoformat(start_time)
    end_dt = datetime.datetime.fromisoformat(end_time)

    if end_dt <= start_dt:
        return Err("End time must be after start time.")

    # Check if parking space exists and is available
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT locked, locked_by, availability_schedule
                FROM parking_spaces
                WHERE id = %s
                """,
                (parking_space_uuid,),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Parking space not found.")

            locked, locked_by, availability_schedule = parking_space

            if locked and locked_by != user_id:
                return Err("Parking space is currently locked by another user.")

            # Check for overlapping reservations
            cur.execute(
                """
                SELECT COUNT(*) 
                FROM reservations
                WHERE parking_space_id = %s
                  AND status = 'book'
                  AND (
                    (start_time < %s AND end_time > %s)
                  )
                """,
                (parking_space_uuid, end_dt, start_dt),
            )
            # We can ignore the type because COUNT will always return a value
            (overlap_count,) = cur.fetchone()  # type: ignore
            if overlap_count > 0:
                return Err(
                    "Parking space is already reserved for the selected time slot."
                )

        # Switch out the row_factory for dict_row because I don't want to refactor the above code just yet
        with conn.cursor(row_factory=dict_row) as cur:
            # Insert the reservation
            cur.execute(
                """
                INSERT INTO reservations (
                    parking_space_id,
                    start_time,
                    end_time,
                    car_info_id,
                    renter_id,
                    status,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, 'book', NOW(), NOW())
                RETURNING id, parking_space_id, start_time, end_time, car_info_id, status, created_at, updated_at
                """,
                (
                    parking_space_uuid,
                    start_dt,
                    end_dt,
                    car_info_uuid,
                    user_id,
                ),
            )

            reservation = cur.fetchone()
            if not reservation:
                return Err("Unable to create reservation")

            return Ok(reservation)


def get_reservation(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    id,
                    parking_space_id, 
                    start_time, 
                    end_time, 
                    car_info_id, 
                    renter_id,
                    status,
                    created_at,
                    updated_at
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found.")

            return Ok(reservation)


def update_reservation(
    user_id: uuid.UUID,
    reservation_id: uuid.UUID,
    start_time: str | None = None,
    end_time: str | None = None,
    car_info_uuid: uuid.UUID | None = None,
) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
                id,
                start_time,
                end_time
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")

            parking_space_id, original_start_time, original_end_time = reservation

            new_start_time = start_time or original_start_time
            new_end_time = end_time or original_end_time

            # If updating time, check for overlaps
            new_start_dt = datetime.datetime.fromisoformat(new_start_time)
            new_end_dt = datetime.datetime.fromisoformat(new_end_time)

            if new_end_dt <= new_start_dt:
                return Err("End time must be after start time.")

            cur.execute(
                """
                SELECT COUNT(*) 
                FROM reservations
                WHERE parking_space_id = %s
                  AND id != %s
                  AND status = 'book'
                  AND (
                    (start_time < %s AND end_time > %s)
                  )
                """,
                (
                    parking_space_id,
                    reservation_id,
                    new_end_dt,
                    new_start_dt,
                ),
            )
            (overlap_count,) = cur.fetchone()  # type: ignore
            if overlap_count > 0:
                return Err(
                    "Parking space is already reserved for the selected time slot."
                )

        with conn.cursor(row_factory=dict_row) as cur:
            # Update the reservation
            cur.execute(
                """
                UPDATE reservations SET
                start_time = %s,
                end_time = %s,
                updated_at = NOW()
                WHERE id = %s
                RETURNING id, parking_space_id, start_time, end_time, car_info_id, renter_id, status, created_at, updated_at
                """,
                (start_time, end_time),
            )
            updated_reservation = cur.fetchone()

            if not updated_reservation:
                return Err("Error updating reservation")

            return Ok(updated_reservation)


def cancel_reservation_logic(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Update the reservation if it exists and is valid
            cur.execute(
                """
                UPDATE reservations
                SET status = 'cancel', updated_at = NOW()
                WHERE id = %s AND renter_id = %s AND status = 'book'
                RETURNING status
                """,
                (reservation_id, user_id),
            )

            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")

            return Ok(None)
