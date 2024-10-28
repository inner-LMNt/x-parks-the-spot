import uuid
from typing import Dict, Any, List
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime
from enum import Enum
import psycopg


class ReservationStatus(Enum):
    book = "booked"
    cancel = "canceled"
    complete = "completed"


def check_if_available(
    conn: psycopg.Connection,
    parking_spot_id: uuid.UUID,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
) -> bool:
    with conn.cursor(row_factory=dict_row) as cur:
        # Check if the spot has a proper timeslot
        cur.execute(
            """
            SELECT count(id) FROM
            timetable_coalesce
            WHERE parking_space_id = %(spot_id)s
            AND   TSTZRANGE(%(start_time), %(end_time), '[]') <@ time
            """,
            {
                "spot_id": parking_spot_id,
                "end_time": end_time,
                "start_time": start_time,
            },
        )
        (count,) = cur.fetchone()  # type: ignore
        if int(count) == 0:
            return False

        # Now check if a reservation overlaps
        cur.execute(
            """
            SELECT count(id) FROM
            reservations
            WHERE parking_space_id = %(spot_id)s
            AND   TSTZRANGE(%(start_time), %(end_time), '[]') && time
            """,
            {
                "spot_id": parking_spot_id,
                "end_time": end_time,
                "start_time": start_time,
            },
        )
        (count,) = cur.fetchone()  # type: ignore
        if int(count) > 0:
            return False

        return True


def get_user_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    id, 
                    parking_space_id, 
                    lower(time) as start_time,
                    upper(time) as end_time,
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
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    car_info_uuid: uuid.UUID,
) -> Result[Dict[str, Any], str]:
    if end_time <= start_time:
        return Err("End time must be after start time.")

    # Book the spot since it is available

    # Check if parking space exists and is available
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # We're gonna do this all in one txn so that's why we passed conn
            if not check_if_available(conn, parking_space_uuid, start_time, end_time):
                return Err("Spot not available")
            # Insert the reservation
            cur.execute(
                """
                INSERT INTO reservations (
                    parking_space_id,
                    time,
                    car_info_id,
                    renter_id,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    %(id)s,
                    TSTZRANGE(%(start_time), %(end_time), '[]'),
                    %(car_id)s,
                    %(user_id)s,
                    'book',
                    NOW(),
                    NOW()
                )
                RETURNING id, parking_space_id, start_time, end_time, car_info_id, status, created_at, updated_at
                """,
                {
                    "id": parking_space_uuid,
                    "start_time": start_time,
                    "end_time": end_time,
                    "car_id": car_info_uuid,
                    "user_id": user_id,
                },
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
                    lower(time) as start_time,
                    upper(time) as end_time,
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
                lower(time) as start_time,
                upper(time) as end_time
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
                  AND status = 'booked'
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

        # FIXME: finish this
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
                SET status = 'canceled', updated_at = NOW()
                WHERE id = %s AND renter_id = %s AND status = 'book'
                RETURNING status
                """,
                (reservation_id, user_id),
            )

            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")

            return Ok(None)
