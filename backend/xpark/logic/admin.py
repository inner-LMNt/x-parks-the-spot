from typing import Dict, Any, List

from psycopg.rows import dict_row
from xpark.utils.mailer import generate_templated_email, send_email
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid


def get_all_conflicts() -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    reports.id,
                    reports.reservation_id,
                    reports.description,
                    reports.type,
                    reports.status,
                    reports.admin_response,
                    reports.created_at,
                    reports.updated_at,
                    users.name as owner_name,
                    parking_spaces.name as parking_space_name,
                    parking_spaces.address as parking_space_address,
                    lower(reservations.time) as start_time,
                    upper(reservations.time) as end_time,
                    reservations.parking_space_id
                FROM reports
                JOIN reservations ON reports.reservation_id = reservations.id
                JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                JOIN users ON users.id = parking_spaces.owner
                WHERE reports.status != 'resolved' -- Only get non-resolved reports
                ORDER BY reports.created_at DESC
                """
            )
            reports = cur.fetchall()
            return Ok(reports)

def update_conflict_response(conflict_id: uuid.UUID, response_text: str) -> Result[Dict[str, Any], str]:
    """
    Update the admin response for a specific conflict report in the database and notify the user via email.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Update the admin response for the given conflict ID
            cur.execute(
                """
                UPDATE reports
                SET admin_response = %s,
                    updated_at = NOW(),
                    status = 'resolved'
                WHERE id = %s
                RETURNING id, reservation_id, description, type, status, admin_response, created_at, updated_at
                """,
                (response_text, str(conflict_id)),
            )
            updated_conflict = cur.fetchone()

            if not updated_conflict:
                return Err(f"Conflict with ID {conflict_id} not found.")

    # Fetch user's name and email to send notification
    reservation_id = updated_conflict["reservation_id"]
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT users.name, users.email
                FROM users
                JOIN reservations ON users.id = reservations.renter_id
                WHERE reservations.id = %s
                """,
                (str(reservation_id),)
            )
            user_info = cur.fetchone()

    if not user_info:
        return Err("User not found for conflict notification.")

    user_name = user_info["name"]
    user_email = user_info["email"]

    # Send email notification
    send_email(
        to=user_email,
        subject="Response to Your Conflict Report with XPark",
        content=generate_templated_email(
            "conflict_response",
            name=user_name,
            description=updated_conflict["description"],
            admin_response=response_text
        )
    )

    return Ok(updated_conflict)



def get_all_pending_parking_spaces() -> Result[Dict[str, List[Dict[str, Any]]], str]:
    """
    Fetch all parking spaces that have a 'pending' verification status from the database.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            query = """
                SELECT
                    id,
                    name,
                    is_paid,
                    verification_status,
                    ST_Y(location::geometry) AS latitude,
                    ST_X(location::geometry) AS longitude,
                    address,
                    availability_schedule,
                    json_build_object(
                         'base_price', price,
                          'dynamic_pricing', FALSE
                    ) as pricing_info,
                    photos,
                    verification_photos,  -- Include verification photos
                    created_at,
                    updated_at
                FROM parking_spaces
                WHERE verification_status = 'pending'
            """
            cur.execute(query)
            rows = cur.fetchall()

            return Ok({"pendingSpaces": rows})

def handle_verify_parking(parking_space_id: uuid.UUID, is_verified: bool) -> Result[Dict[str, Any], str]:
    # Step 1: Fetch the owner (user ID) of the parking space
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            cur.execute(
                """
                SELECT owner FROM parking_spaces WHERE id = %s
                """,
                (str(parking_space_id),)
            )
            user_id_result = cur.fetchone()
            if not user_id_result:
                return Err(f"Parking space with ID {parking_space_id} not found.")

            user_id = user_id_result["owner"]  # Access user_id directly

    # Step 2: Update the parking space verification status
    verification_status = 'verified' if is_verified else 'rejected'

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            cur.execute(
                """
                UPDATE parking_spaces
                SET verification_status = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id, verification_status, updated_at
                """,
                (verification_status, str(parking_space_id)),
            )
            updated_space = cur.fetchone()
            if not updated_space:
                return Err(f"Failed to update the verification status of parking space with ID {parking_space_id}.")

    # Step 3: Fetch the user's name and email by user ID
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            cur.execute(
                """
                SELECT name, email FROM users WHERE id = %s
                """,
                (str(user_id),)
            )
            user_info_result = cur.fetchone()
            if not user_info_result:
                return Err(f"User information not found for user ID {user_id}.")

            user_name = user_info_result["name"]  # Access directly
            user_email = user_info_result["email"]  # Access directly

    # Step 4: Send an email notification to the user
    if is_verified:
        send_email(
            to=user_email,
            subject="Parking spot verification successful",
            content=generate_templated_email(
                "spot_verified",
                name=user_name  # Use the fetched user's name
            ),
        )
    else:
        send_email(
            to=user_email,
            subject="Parking spot verification rejected",
            content=generate_templated_email(
                "spot_rejected",
                name=user_name  # Use the fetched user's name
            ),
        )

    return Ok(updated_space)