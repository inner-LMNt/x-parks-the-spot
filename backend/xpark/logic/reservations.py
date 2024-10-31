import uuid
from typing import Optional, Dict, Any, List
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
            AND   TSTZRANGE(%(start_time)s, %(end_time)s, '[]') <@ time
            """,
            {
                "spot_id": parking_spot_id,
                "end_time": end_time,
                "start_time": start_time,
            },
        )
        count = cur.fetchone()["count"]  # type: ignore
        if int(count) == 0:
            return False

        # Now check if a reservation overlaps
        cur.execute(
            """
            SELECT count(id) FROM
            reservations
            WHERE parking_space_id = %(spot_id)s
            AND   TSTZRANGE(%(start_time)s, %(end_time)s, '[]') && time
            """,
            {
                "spot_id": parking_spot_id,
                "end_time": end_time,
                "start_time": start_time,
            },
        )
        count = cur.fetchone()["count"]  # type: ignore
        if int(count) > 0:
            return False

        return True


def get_user_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    reservations.id, 
                    parking_spaces.name,
                    parking_space_id, 
                    lower(time) as start_time,
                    upper(time) as end_time,
                    car_info_id, 
                    renter_id,
                    status,
                    reservations.created_at,
                    reservations.updated_at
                FROM reservations JOIN parking_spaces ON 
                    reservations.parking_space_id = parking_spaces.id
                WHERE renter_id = %s
            """,
                (user_id,),
            )
            return Ok(cur.fetchall())


def create_reservation(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    car_info_id: uuid.UUID,
) -> Result[Dict[str, Any], str]:
    if end_time <= start_time:
        return Err("End time must be after start time.")

    # Book the spot since it is available

    # Check if parking space exists and is available
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # We're gonna do this all in one txn so that's why we passed conn
            if not check_if_available(conn, parking_space_id, start_time, end_time):
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
                    TSTZRANGE(%(start_time)s, %(end_time)s, '[]'),
                    %(car_id)s,
                    %(user_id)s,
                    'booked',
                    NOW(),
                    NOW()
                )
                RETURNING id, parking_space_id, lower(time) as start_time, upper(time) as end_time, car_info_id, status, created_at, updated_at
                """,
                {
                    "id": parking_space_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "car_id": car_info_id,
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
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    car_info_uuid: Optional[uuid.UUID] = None,
) -> Result[Dict[str, Any], str]:
    """
    Update an existing reservation with new start and/or end times.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Fetch the existing reservation details
            cur.execute(
                """
                SELECT 
                    parking_space_id,
                    lower(time) AS start_time,
                    upper(time) AS end_time
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")

            # If the cursor returns a dict, access values by keys
            parking_space_id = reservation['parking_space_id']
            original_start_time = reservation['start_time']
            original_end_time = reservation['end_time']

            # Determine the new start and end times
            new_start_time = start_time or original_start_time
            new_end_time = end_time or original_end_time

            # Convert to datetime objects if necessary
            if isinstance(new_start_time, str):
                new_start_dt = datetime.datetime.fromisoformat(new_start_time)
            elif isinstance(new_start_time, datetime.datetime):
                new_start_dt = new_start_time
            else:
                return Err("Invalid start time format")

            if isinstance(new_end_time, str):
                new_end_dt = datetime.datetime.fromisoformat(new_end_time)
            elif isinstance(new_end_time, datetime.datetime):
                new_end_dt = new_end_time
            else:
                return Err("Invalid end time format")

            # Ensure times are timezone-aware (assuming UTC if not)
            if new_start_dt.tzinfo is None:
                new_start_dt = new_start_dt.replace(tzinfo=datetime.timezone.utc)
            if new_end_dt.tzinfo is None:
                new_end_dt = new_end_dt.replace(tzinfo=datetime.timezone.utc)

            # Validate that end time is after start time
            if new_end_dt <= new_start_dt:
                return Err("End time must be after start time.")

            # Prepare the time range as text for SQL
            new_start_iso = new_start_dt.isoformat()
            new_end_iso = new_end_dt.isoformat()

            # Check for overlapping reservations
            cur.execute(
                """
                SELECT COUNT(*) 
                FROM reservations
                WHERE parking_space_id = %s
                  AND id != %s
                  AND status = 'booked'
                  AND time && tstzrange(%s, %s, '[)')
                """,
                (
                    parking_space_id,
                    reservation_id,
                    new_start_iso,
                    new_end_iso,
                ),
            )
            (overlap_count,) = cur.fetchone()
            if overlap_count > 0:
                return Err("Parking space is already reserved for the selected time slot.")

        # Update the reservation
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE reservations SET
                    time = tstzrange(%s, %s, '[)'),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, parking_space_id, time, car_info_id, renter_id, status, created_at, updated_at
                """,
                (
                    new_start_iso,
                    new_end_iso,
                    reservation_id,
                ),
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
                WHERE id = %s AND renter_id = %s AND status = 'booked'
                RETURNING status
                """,
                (reservation_id, user_id),
            )

            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")

            return Ok(None)

def get_max_extension_time_logic(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Fetch reservation details
            cur.execute(
                """
                SELECT 
                    upper(reservations.time) AS end_time,
                    reservations.parking_space_id
                FROM reservations
                WHERE reservations.id = %s AND reservations.renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()

            if not reservation:
                print("Reservation not found or not authorized")
                return Err("Reservation not found or not authorized")

            current_end_time = reservation["end_time"]
            parking_space_id = reservation["parking_space_id"]

            if not current_end_time:
                print("Invalid reservation end time")
                return Err("Invalid reservation end time")

            # Ensure current_end_time is timezone-aware
            if current_end_time.tzinfo is None:
                current_end_time = current_end_time.replace(tzinfo=tzutc())

            # Fetch availability ranges that include the current end time
            cur.execute(
                """
                SELECT time
                FROM paid_parking_allowed_availability
                WHERE parking_space_id = %s AND time @> %s::timestamptz
                """,
                (parking_space_id, current_end_time),
            )
            availability_records = cur.fetchall()

            if not availability_records:
                print("No available slots for extension")
                return Err("No available slots for extension")

            # Determine the maximum extension time from availability ranges
            max_extension_time = None
            for record in availability_records:
                availability_range = record["time"]
                if availability_range.upper_inf:
                    potential_max_time = datetime.max.replace(tzinfo=tzutc())
                else:
                    potential_max_time = availability_range.upper

                if max_extension_time is None or potential_max_time > max_extension_time:
                    max_extension_time = potential_max_time

            if max_extension_time is None:
                print("Unable to determine maximum extension time")
                return Err("Unable to determine maximum extension time")

            # Check for overlapping future reservations
            cur.execute(
                """
                SELECT MIN(lower(res.time)) as next_reservation_start
                FROM reservations res
                WHERE res.parking_space_id = %s AND lower(res.time) > %s
                """,
                (parking_space_id, current_end_time),
            )
            next_reservation = cur.fetchone()

            if next_reservation and next_reservation["next_reservation_start"]:
                next_reservation_start = next_reservation["next_reservation_start"]
                if next_reservation_start < max_extension_time:
                    max_extension_time = next_reservation_start

            # Ensure max_extension_time is after current_end_time
            if max_extension_time <= current_end_time:
                print("No available time for extension")
                return Err("No available time for extension")

            # Convert to ISO format
            max_extension_time_iso = max_extension_time.isoformat()

            return Ok(max_extension_time_iso)

