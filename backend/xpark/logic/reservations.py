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
    print(start_time, end_time)
    with conn.cursor(row_factory=dict_row) as cur:
        # Check if the spot has a proper timeslot
        cur.execute(
            """
            SELECT count(id) FROM
            timetable_coalesce
            WHERE parking_space_id = %(spot_id)s
            AND TSTZRANGE(%(start_time)s, %(end_time)s, '[]') <@ time
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
        print(count)
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
    start_time: Optional[datetime.datetime] = None,
    end_time: Optional[datetime.datetime] = None,
    car_info_id: Optional[uuid.UUID] = None,
) -> Result[Dict[str, Any] | None, str]:

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    parking_space_id,
                    lower(time) AS start_time,
                    upper(time) AS end_time,
                    car_info_id
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")
            print(start_time,end_time)
            if start_time is not None:
                if not check_if_available(
                        conn=conn,
                        parking_spot_id=reservation["parking_space_id"],
                        start_time=start_time,
                        end_time=reservation["start_time"] - datetime.timedelta(seconds=1),
                ):
                    return Err("Cannot extend booking to this time")
            if end_time is not None:
                if not check_if_available(
                    conn=conn,
                    parking_spot_id=reservation["parking_space_id"],
                    start_time=reservation["end_time"] + datetime.timedelta(seconds=1),
                    end_time=end_time,
                ):
                    return Err("Cannot extend booking to this time")

            if not start_time:
                start_time = reservation["start_time"]
            if not end_time:
                end_time = reservation["end_time"]
        print("updating")
        # Update reservation
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE reservations SET
                    time = tstzrange(%s, %s, '[]'),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, parking_space_id, lower(time) as start_time, upper(time) as end_time, car_info_id, renter_id, status, created_at, updated_at
                """,
                (
                    start_time,
                    end_time,
                    reservation_id,
                ),
            )
            updated_reservation = cur.fetchone()
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
                    parking_space_id,
                    lower(time) AS start_time,
                    upper(time) AS end_time,
                    car_info_id
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()

            if not reservation:
                return Err("Reservation not found or not authorized")

            current_end_time = reservation["end_time"]
            if not current_end_time:
                return Err("Invalid reservation end time")

            # Search by hour first (up to a week)
            max_hours = 24 * 7
            available_hour = None

            for hour in range(1, max_hours + 1):
                test_end_time = current_end_time + datetime.timedelta(hours=hour)

                if not check_if_available(
                        conn=conn,
                        parking_spot_id=reservation["parking_space_id"],
                        start_time=current_end_time + datetime.timedelta(seconds=1),
                        end_time=test_end_time,
                ):
                    available_hour = hour - 1
                    break

            if available_hour is None:
                available_hour = max_hours

            if available_hour == 0:
                return Err("No available time for extension")

            # Binary search for exact minute within the last available hour
            start_minute = 0
            end_minute = 60
            last_valid_time = None

            while start_minute <= end_minute:
                mid_minute = (start_minute + end_minute) // 2
                test_end_time = current_end_time + datetime.timedelta(
                    hours=available_hour,
                    minutes=mid_minute
                )

                if check_if_available(
                        conn=conn,
                        parking_spot_id=reservation["parking_space_id"],
                        start_time=current_end_time + datetime.timedelta(seconds=1),
                        end_time=test_end_time,
                ):
                    last_valid_time = test_end_time
                    start_minute = mid_minute + 1
                else:
                    end_minute = mid_minute - 1

            if not last_valid_time:
                last_valid_time = current_end_time + datetime.timedelta(hours=available_hour)

            return Ok(last_valid_time.isoformat())