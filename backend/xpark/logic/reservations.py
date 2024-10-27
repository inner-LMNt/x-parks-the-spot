# xpark/logic/reservations.py

import uuid
from typing import Dict, Any, List
from psycopg.rows import dict_row

from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime
from datetime import timezone
import logging
from datetime import time as dt_time

logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)


def get_user_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    """
    Fetch current user's reservations from the database.
    """
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
    parking_space_id: str,
    start_time: str,
    end_time: str,
    car_info_id: str,
    renter_id: str,
) -> Result[Dict[str, Any], str]:
    """
    Create a new reservation.
    """
    parking_space_uuid = uuid.UUID(parking_space_id)
    car_info_uuid = uuid.UUID(car_info_id)
    renter_uuid = uuid.UUID(renter_id)
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
                  AND status = 'booked'
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

            # Function to check if reservation fits within availability_schedule
            def is_within_availability(
                start_dt: datetime.datetime,
                end_dt: datetime.datetime,
                availability: List[Dict[str, Any]],
            ) -> bool:
                """
                Check if the reservation from start_dt to end_dt fits within the availability schedule.
                """
                # Build a mapping from day_of_week to list of (start_time, end_time)
                availability_map = {} # type: ignore
                for slot in availability:
                    day = slot.get("day_of_week")
                    start_time_str = slot.get("start_time")  # Assuming "HH:MM"
                    end_time_str = slot.get("end_time")  # Assuming "HH:MM"

                    if not all([day, start_time_str, end_time_str]):
                        continue  # Skip invalid slots

                    try:
                        slot_start_time = datetime.datetime.strptime(
                            start_time_str, "%H:%M"  # type: ignore
                        ).time()
                        slot_end_time = datetime.datetime.strptime(
                            end_time_str, "%H:%M"  # type: ignore
                        ).time()
                    except ValueError:
                        continue  # Skip slots with invalid time format

                    if day not in availability_map:
                        availability_map[day] = []
                    availability_map[day].append((slot_start_time, slot_end_time))

                # Iterate through each day in the reservation
                current_dt = start_dt
                while current_dt.date() <= end_dt.date():
                    day_of_week = current_dt.strftime("%A")  # e.g., 'Monday'

                    if day_of_week not in availability_map:
                        logger.debug(f"No availability for {day_of_week}.")
                        return False  # No availability for this day

                    # Determine the reservation's time on this day
                    if current_dt.date() == start_dt.date():
                        day_start = current_dt.time()
                    else:
                        day_start = dt_time(0, 0)

                    if current_dt.date() == end_dt.date():
                        day_end = end_dt.time()
                    else:
                        day_end = dt_time(23, 59, 59)

                    # Check if the reservation's time on this day fits within any available slot
                    slots = availability_map[day_of_week]
                    slot_fits = False
                    for slot_start, slot_end in slots:
                        # Handle 24-hour availability
                        if slot_start == slot_end:
                            slot_fits = True
                            break

                        if slot_start <= day_start and day_end <= slot_end:
                            slot_fits = True
                            break

                    if not slot_fits:
                        logger.debug(
                            f"Reservation time on {day_of_week} from {day_start} to {day_end} does not fit within availability."
                        )
                        return False

                    current_dt += datetime.timedelta(days=1)

                return True

            # Check availability
            if not is_within_availability(start_dt, end_dt, availability_schedule):
                return Err("Reservation times are outside of availability schedule.")

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
                ) VALUES (%s, %s, %s, %s, %s, 'booked', NOW(), NOW()) RETURNING id
                """,
                (
                    parking_space_uuid,
                    start_dt,
                    end_dt,
                    car_info_uuid,
                    renter_uuid,
                ),
            )

            # only an error would cause this to fail, and we should've returned a 500 before we reach here
            # so it's fine to ignore the null check
            (reservation_id,) = cur.fetchone()  # type: ignore

            # Construct the response
            reservation = {
                "id": reservation_id,
                "parking_space_id": parking_space_uuid,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "car_info_id": car_info_uuid,
                "renter_id": renter_uuid,
                "status": "booked",
                "created_at": datetime.datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.datetime.now(timezone.utc).isoformat(),
            }

            return Ok(reservation)


def get_reservation(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[Dict[str, Any], str]:
    """
    Get reservation details by ID, ensuring it belongs to the user.
    """
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


def update_reservation_logic(
    user_id: uuid.UUID, reservation_id: uuid.UUID, updates: Dict[str, Any]
) -> Result[Dict[str, Any], str]:
    """
    Update an existing reservation.
    """
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Fetch the reservation
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
                WHERE id = %s
                """,
                (str(reservation_id),),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found.")

            (
                id,
                parking_space_id,
                start_time,
                end_time,
                car_info_id,
                renter_id,
                status,
                created_at,
                updated_at,
            ) = reservation

            if str(renter_id) != str(user_id):
                return Err("User not authorized to update this reservation.")

            # Only allow updating certain fields
            allowed_fields = {"start_time", "end_time", "car_info_id", "status"}
            set_clauses = []
            values = []

            for key, value in updates.items():
                if key in allowed_fields:
                    if key in {"start_time", "end_time"}:
                        # Validate date format
                        try:
                            dt = datetime.datetime.fromisoformat(value)
                            set_clauses.append(f"{key} = %s")
                            values.append(dt)
                        except ValueError:
                            return Err(f"Invalid date format for {key}. Use ISO 8601.")
                    elif key == "car_info_id":
                        try:
                            car_info_uuid = uuid.UUID(value)
                            set_clauses.append(f"{key} = %s")
                            values.append(str(car_info_uuid)) # type: ignore
                        except ValueError:
                            return Err("Invalid UUID format for car_info_id.")
                    elif key == "status":
                        if value not in {"booked", "canceled", "completed"}:
                            return Err("Invalid status value.")
                        set_clauses.append(f"{key} = %s")
                        values.append(value)

            if not set_clauses:
                return Err("No valid fields to update.")

            # If updating time, check for overlaps
            new_start_time = updates.get("start_time", start_time.isoformat())
            new_end_time = updates.get("end_time", end_time.isoformat())
            try:
                new_start_dt = datetime.datetime.fromisoformat(new_start_time)
                new_end_dt = datetime.datetime.fromisoformat(new_end_time)
            except ValueError:
                return Err("Invalid date format. Use ISO 8601.")

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
                    str(parking_space_id),
                    str(reservation_id),
                    new_end_dt,
                    new_start_dt,
                ),
            )
            (overlap_count,) = cur.fetchone()  # type: ignore
            if overlap_count > 0:
                return Err(
                    "Parking space is already reserved for the selected time slot."
                )

            # Update the reservation
            query = f"""
                UPDATE reservations
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, parking_space_id, start_time, end_time, car_info_id, renter_id, status, created_at, updated_at
            """
            values.append(str(reservation_id))  # type: ignore
            cur.execute(query, tuple(values))
            updated_reservation = cur.fetchone()

            (
                id,
                parking_space_id,
                start_time,
                end_time,
                car_info_id,
                renter_id,
                status,
                created_at,
                updated_at,
            ) = updated_reservation  # type: ignore

            # Commit the transaction
            conn.commit()

            reservation_data = {
                "id": str(id),
                "parking_space_id": str(parking_space_id),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "car_info_id": str(car_info_id),
                "renter_id": str(renter_id),
                "status": status,
                "created_at": created_at.isoformat(),
                "updated_at": updated_at.isoformat(),
            }

            return Ok(reservation_data)


def cancel_reservation_logic(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[None, str]:
    """
    Cancel a reservation.
    """
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Fetch the reservation
            cur.execute(
                """
                SELECT 
                    parking_space_id, 
                    status,
                    start_time
                FROM reservations
                WHERE id = %s
                """,
                (str(reservation_id),),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found.")

            parking_space_id, status, start_time = reservation
            if status == "canceled":
                return Err("Reservation is already canceled.")

            # Verify ownership
            cur.execute(
                """
                SELECT renter_id
                FROM reservations
                WHERE id = %s
                """,
                (str(reservation_id),),
            )
            (renter_id,) = cur.fetchone()  # type: ignore

            if str(renter_id) != str(user_id):
                return Err("User not authorized to cancel this reservation.")
            
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)

            # Check if the current time is at least 2 hours before the reservation start time
            current_time = datetime.datetime.now(timezone.utc)
            if start_time - current_time < datetime.timedelta(hours=2):
                return Err("Reservations can only be canceled at least 2 hours before the start time.")

            # Update the reservation status to canceled
            cur.execute(
                """
                UPDATE reservations
                SET status = 'canceled', updated_at = NOW()
                WHERE id = %s
                """,
                (str(reservation_id),),
            )

            conn.commit()

            return Ok(None)