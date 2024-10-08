# xpark/logic/reservations.py

import os
import uuid
import json
from typing import Dict, Any, List, Optional, Tuple

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from xpark import Config
from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime


def get_user_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    """
    Fetch current user's reservations from the database.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                query = """
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
                """
                params = [str(user_id)]
                cur.execute(query, params)
                rows = cur.fetchall()

                # Retrieve column names
                col_names = [desc[0] for desc in cur.description]

                reservations = []
                for row in rows:
                    row_dict = dict(zip(col_names, row))
                    reservation = {
                        "id": str(row_dict['id']),
                        "parking_space_id": str(row_dict['parking_space_id']),
                        "start_time": row_dict['start_time'].isoformat(),
                        "end_time": row_dict['end_time'].isoformat(),
                        "car_info_id": str(row_dict['car_info_id']),
                        "renter_id": str(row_dict['renter_id']),
                        "status": row_dict['status'],
                        "created_at": row_dict['created_at'].isoformat(),
                        "updated_at": row_dict['updated_at'].isoformat(),
                    }
                    reservations.append(reservation)

                return Ok(reservations)
    except Exception as e:
        return Err(str(e))


def create_reservation(user_id: uuid.UUID, data: Dict[str, Any]) -> Result[Dict[str, Any], str]:
    """
    Create a new reservation.
    """
    try:
        parking_space_id = data.get('parking_space_id')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        car_info_id = data.get('car_info_id')
        renter_id = data.get('renter_id')

        if not all([parking_space_id, start_time, end_time, car_info_id, renter_id]):
            return Err("Missing required reservation fields.")

        # Validate UUIDs
        try:
            parking_space_uuid = uuid.UUID(parking_space_id)
            car_info_uuid = uuid.UUID(car_info_id)
            renter_uuid = uuid.UUID(renter_id)
        except ValueError:
            return Err("Invalid UUID format in reservation fields.")

        # Validate start_time and end_time
        try:
            start_dt = datetime.datetime.fromisoformat(start_time)
            end_dt = datetime.datetime.fromisoformat(end_time)
        except ValueError:
            return Err("Invalid date format. Use ISO 8601.")

        if end_dt <= start_dt:
            return Err("End time must be after start time.")

        # Check if parking space exists and is available
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT is_locked, is_reserved
                    FROM parking_spaces
                    WHERE id = %s
                    """,
                    (str(parking_space_uuid),)
                )
                parking_space = cur.fetchone()
                if not parking_space:
                    return Err("Parking space not found.")

                is_locked, is_reserved = parking_space

                if is_locked:
                    return Err("Parking space is currently locked.")
                if is_reserved:
                    return Err("Parking space is already reserved.")

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
                    (str(parking_space_uuid), end_dt, start_dt)
                )
                (overlap_count,) = cur.fetchone()
                if overlap_count > 0:
                    return Err("Parking space is already reserved for the selected time slot.")

                # Insert the reservation
                reservation_id = uuid.uuid4()
                cur.execute(
                    """
                    INSERT INTO reservations (
                        id,
                        parking_space_id,
                        start_time,
                        end_time,
                        car_info_id,
                        renter_id,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'booked', NOW(), NOW())
                    """,
                    (
                        str(reservation_id),
                        str(parking_space_uuid),
                        start_dt,
                        end_dt,
                        str(car_info_uuid),
                        str(renter_uuid),
                    )
                )

                # Update parking space status to reserved
                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET is_reserved = TRUE
                    WHERE id = %s
                    """,
                    (str(parking_space_uuid),)
                )

                conn.commit()

                # Construct the response
                reservation = {
                    "id": str(reservation_id),
                    "parking_space_id": str(parking_space_uuid),
                    "start_time": start_dt.isoformat(),
                    "end_time": end_dt.isoformat(),
                    "car_info_id": str(car_info_uuid),
                    "renter_id": str(renter_uuid),
                    "status": "booked",
                    "created_at": datetime.datetime.now().isoformat(),
                    "updated_at": datetime.datetime.now().isoformat(),
                }

                return Ok(reservation)

    except Exception as e:
        return Err(str(e))


def get_reservation(user_id: uuid.UUID, reservation_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    """
    Get reservation details by ID, ensuring it belongs to the user.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
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
                    (str(reservation_id),)
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
                    updated_at
                ) = reservation

                if str(renter_id) != str(user_id):
                    return Err("User not authorized to access this reservation.")

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
    except Exception as e:
        return Err(str(e))


def update_reservation_logic(user_id: uuid.UUID, reservation_id: uuid.UUID, updates: Dict[str, Any]) -> Result[Dict[str, Any], str]:
    """
    Update an existing reservation.
    """
    try:
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
                    (str(reservation_id),)
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
                    updated_at
                ) = reservation

                if str(renter_id) != str(user_id):
                    return Err("User not authorized to update this reservation.")

                # Only allow updating certain fields
                allowed_fields = {'start_time', 'end_time', 'car_info_id', 'status'}
                set_clauses = []
                values = []

                for key, value in updates.items():
                    if key in allowed_fields:
                        if key in {'start_time', 'end_time'}:
                            # Validate date format
                            try:
                                dt = datetime.datetime.fromisoformat(value)
                                set_clauses.append(f"{key} = %s")
                                values.append(dt)
                            except ValueError:
                                return Err(f"Invalid date format for {key}. Use ISO 8601.")
                        elif key == 'car_info_id':
                            try:
                                car_info_uuid = uuid.UUID(value)
                                set_clauses.append(f"{key} = %s")
                                values.append(str(car_info_uuid))
                            except ValueError:
                                return Err("Invalid UUID format for car_info_id.")
                        elif key == 'status':
                            if value not in {'booked', 'canceled', 'completed'}:
                                return Err("Invalid status value.")
                            set_clauses.append(f"{key} = %s")
                            values.append(value)

                if not set_clauses:
                    return Err("No valid fields to update.")

                # If updating time, check for overlaps
                new_start_time = updates.get('start_time', start_time.isoformat())
                new_end_time = updates.get('end_time', end_time.isoformat())
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
                        new_start_dt
                    )
                )
                (overlap_count,) = cur.fetchone()
                if overlap_count > 0:
                    return Err("Parking space is already reserved for the selected time slot.")

                # Update the reservation
                query = f"""
                    UPDATE reservations
                    SET {', '.join(set_clauses)}, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, parking_space_id, start_time, end_time, car_info_id, renter_id, status, created_at, updated_at
                """
                values.append(str(reservation_id))
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
                    updated_at
                ) = updated_reservation

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

    except Exception as e:
        return Err(str(e))


def cancel_reservation_logic(user_id: uuid.UUID, reservation_id: uuid.UUID) -> Result[None, str]:
    """
    Cancel a reservation.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                # Fetch the reservation
                cur.execute(
                    """
                    SELECT 
                        parking_space_id, 
                        status
                    FROM reservations
                    WHERE id = %s
                    """,
                    (str(reservation_id),)
                )
                reservation = cur.fetchone()
                if not reservation:
                    return Err("Reservation not found.")

                parking_space_id, status = reservation

                if status == 'canceled':
                    return Err("Reservation is already canceled.")

                # Verify ownership
                cur.execute(
                    """
                    SELECT renter_id
                    FROM reservations
                    WHERE id = %s
                    """,
                    (str(reservation_id),)
                )
                renter_id, = cur.fetchone()

                if str(renter_id) != str(user_id):
                    return Err("User not authorized to cancel this reservation.")

                # Update the reservation status to canceled
                cur.execute(
                    """
                    UPDATE reservations
                    SET status = 'canceled', updated_at = NOW()
                    WHERE id = %s
                    """,
                    (str(reservation_id),)
                )

                # Update parking space status to available
                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET is_reserved = FALSE
                    WHERE id = %s
                    """,
                    (str(parking_space_id),)
                )

                conn.commit()

                return Ok(None)
    except Exception as e:
        return Err(str(e))


def lock_parking_space(user_id: uuid.UUID, parking_space_id: uuid.UUID, lock_duration: str) -> Result[Dict[str, Any], str]:
    """
    Lock a parking space for a specified duration.
    lock_duration should be in ISO 8601 duration format, e.g., 'PT15M' for 15 minutes.
    """
    try:
        # Parse lock_duration
        if not lock_duration.startswith('PT'):
            return Err("Invalid lock_duration format. Use ISO 8601 duration, e.g., 'PT15M'.")

        # For simplicity, handle only minutes
        minutes_str = lock_duration[2:-1]  # Remove 'PT' and 'M'
        try:
            minutes = int(minutes_str)
        except ValueError:
            return Err("Invalid lock_duration value. Minutes must be an integer.")

        lock_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=minutes)

        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                # Check if parking space exists
                cur.execute(
                    """
                    SELECT is_locked, locked_by, locked_until, is_reserved
                    FROM parking_spaces
                    WHERE id = %s
                    """,
                    (str(parking_space_id),)
                )
                parking_space = cur.fetchone()
                if not parking_space:
                    return Err("Parking space not found.")

                is_locked, locked_by, locked_until, is_reserved = parking_space

                if is_locked and locked_by != str(user_id):
                    return Err("Parking space is already locked by another user.")

                if is_reserved:
                    return Err("Parking space is already reserved.")

                # Lock the parking space
                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET is_locked = TRUE,
                        locked_by = %s,
                        locked_until = %s
                    WHERE id = %s
                    """,
                    (str(user_id), lock_until, str(parking_space_id))
                )

                conn.commit()

                response_data = {
                    "message": "Parking space locked successfully.",
                    "lock_until": lock_until.isoformat() + 'Z'
                }

                return Ok(response_data)

    except Exception as e:
        return Err(str(e))


def unlock_parking_space(user_id: uuid.UUID, parking_space_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    """
    Unlock a previously locked parking space.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                # Fetch parking space
                cur.execute(
                    """
                    SELECT is_locked, locked_by
                    FROM parking_spaces
                    WHERE id = %s
                    """,
                    (str(parking_space_id),)
                )
                parking_space = cur.fetchone()
                if not parking_space:
                    return Err("Parking space not found.")

                is_locked, locked_by = parking_space

                if not is_locked:
                    return Err("Parking space is not currently locked.")

                if locked_by != str(user_id):
                    return Err("Parking space is not locked by the user.")

                # Unlock the parking space
                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET is_locked = FALSE,
                        locked_by = NULL,
                        locked_until = NULL
                    WHERE id = %s
                    """,
                    (str(parking_space_id),)
                )

                conn.commit()

                response_data = {
                    "message": "Parking space unlocked successfully."
                }

                return Ok(response_data)
    except Exception as e:
        return Err(str(e))
