from typing import Dict, Any, List

from psycopg.rows import dict_row
from xpark.utils.mailer import generate_templated_email, send_email
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid

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
                    pricing_info,
                    photos,
                    verification_photos,  -- Include verification photos
                    created_at,
                    updated_at
                FROM parking_spaces
                WHERE verification_status = 'pending'
            """
            cur.execute(query)
            rows = cur.fetchall()

            pendingSpaces = []
            for row in rows:
                parking_space = {
                    "id": str(row["id"]),
                    "name": row["name"] or "Unnamed Spot",
                    "is_paid": row["is_paid"],
                    "status": row["verification_status"] or "Pending",
                    "created_at": row["created_at"].isoformat(),
                    "updated_at": row["updated_at"].isoformat(),
                    "location": {
                        "latitude": float(row["latitude"]),
                        "longitude": float(row["longitude"]),
                        "address": row["address"] or "",
                    },
                    "availability_schedule": row["availability_schedule"] or [],
                    "pricing_info": row["pricing_info"] or {},
                    "photos": row["photos"] or [],
                    "verification_photos": row["verification_photos"] or [],
                }

                pendingSpaces.append(parking_space)

            return Ok({"pendingSpaces": pendingSpaces})

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
            result = cur.fetchone()
            if not result:
                return Err(f"Failed to update the verification status of parking space with ID {parking_space_id}.")

            updated_space = {
                "id": str(result["id"]),
                "verification_status": result["verification_status"],
                "updated_at": result["updated_at"].isoformat(),
            }

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