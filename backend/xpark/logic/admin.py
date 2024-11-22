import os
from typing import Dict, Any, List

from psycopg.rows import dict_row

from xpark.utils.mailer import generate_templated_email, send_email
from xpark.utils.db import DB
import random
from result import Result, Ok, Err
import uuid


def handle_ban_user(ban_user_id: uuid.UUID, rationale: str) -> Result[None, str]:
    """
    Ban a user and perform cascading effects as described.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Verify the user exists and is not already deleted/banned
                cur.execute(
                    """
                    SELECT email, name, deleted_at, is_banned
                    FROM users WHERE id = %s
                    """,
                    (str(ban_user_id),),
                )
                banned_user = cur.fetchone()

                if not banned_user:
                    return Err("User not found.")
                if banned_user["deleted_at"]:
                    return Err("Cannot ban a user who has been deleted.")
                if banned_user.get("is_banned", False):
                    return Err("User is already banned.")

                # Fetch reservations to notify users/owners
                cur.execute(
                    """
                    SELECT r.id, ps.name AS parking_space_name, ps.owner, u.email AS owner_email
                    FROM reservations r
                    JOIN parking_spaces ps ON r.parking_space_id = ps.id
                    JOIN users u ON ps.owner = u.id
                    WHERE r.renter_id = %s AND r.status = 'booked'
                    """,
                    (str(ban_user_id),),
                )
                future_reservations = cur.fetchall()

                for reservation in future_reservations:
                    send_email(
                        to=reservation["owner_email"],
                        subject="Reservation Cancellation",
                        content=generate_templated_email(
                            "reservation_cancellation",
                            parking_space_name=reservation[
                                "parking_space_name"
                            ],  # Use the name here
                            reason="The renter has been banned.",
                        ),
                    )

                # Cancel future reservations on user's owned parking spaces
                cur.execute(
                    """
                    SELECT
                        r.id,
                        r.renter_id,
                        lower(r.time) AS start_time,
                        upper(r.time) AS end_time,
                        u.email AS renter_email,
                        ps.name AS parking_space_name
                    FROM reservations r
                    JOIN users u ON r.renter_id = u.id
                    JOIN parking_spaces ps ON r.parking_space_id = ps.id
                    WHERE ps.owner = %s
                    AND r.status = 'booked';
                    """,
                    (str(ban_user_id),),
                )
                future_rentals = cur.fetchall()

                for rental in future_rentals:
                    send_email(
                        to=rental["renter_email"],
                        subject="Reservation Cancellation",
                        content=generate_templated_email(
                            "reservation_owner_ban",
                            parking_space_name=rental["parking_space_name"],
                            start_time=rental["start_time"],
                            end_time=rental["end_time"],
                        ),
                    )

                # Mark the user as banned and soft-deleted
                cur.execute(
                    """
                    UPDATE users
                    SET is_banned = TRUE,
                        deleted_at = NOW()
                    WHERE id = %s
                    """,
                    (str(ban_user_id),),
                )

                # Delete parking spaces owned by the banned user
                cur.execute(
                    """
                    DELETE FROM parking_spaces
                    WHERE owner = %s
                    """,
                    (str(ban_user_id),),
                )

                # Delete all tokens for the user
                cur.execute(
                    """
                    DELETE FROM user_tokens
                    WHERE user_id = %s
                    """,
                    (str(ban_user_id),),
                )

                # Remove user's reports
                cur.execute(
                    """
                    DELETE FROM reports WHERE user_id = %s
                    """,
                    (str(ban_user_id),),
                )

                # Remove user's reservation
                cur.execute(
                    """
                    DELETE FROM reservation WHERE renter_id = %s
                    """,
                    (str(ban_user_id),),
                )

        conn.commit()

        # Notify the banned user
        send_email(
            to=banned_user["email"],
            subject="Your Account Has Been Banned",
            content=generate_templated_email(
                "user_banned",
                name=banned_user["name"],
                rationale=rationale,
            ),
        )

        return Ok(None)

    except Exception as e:
        return Err(f"Database or email operation failed: {str(e)}")


def fetch_user_details(user_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    """
    Fetch user details including past bookings, parking spaces, and reports.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Fetch user basic information
                cur.execute(
                    """
                    SELECT id, name, email
                    FROM users
                    WHERE id = %s
                    """,
                    (str(user_id),),
                )
                user_info = cur.fetchone()
                if not user_info:
                    return Err("User not found")

                # Fetch user past bookings
                cur.execute(
                    """
                    SELECT
                        reservations.id,
                        reservations.status,
                        LOWER(reservations.time) AS start_time,
                        UPPER(reservations.time) AS end_time,
                        reservations.price AS cost,
                        parking_spaces.name AS parking_space_name,
                        parking_spaces.address AS parking_space_address
                    FROM reservations
                    JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                    WHERE reservations.renter_id = %s
                    ORDER BY reservations.created_at DESC
                    """,
                    (str(user_id),),
                )
                past_bookings = cur.fetchall()

                # Fetch user parking spaces
                cur.execute(
                    """
                    SELECT
                        id,
                        name,
                        address,
                        verification_status,
                        created_at
                    FROM parking_spaces
                    WHERE owner = %s
                    ORDER BY created_at DESC
                    """,
                    (str(user_id),),
                )
                parking_spaces = cur.fetchall()

                # Fetch user reports
                cur.execute(
                    """
                    SELECT
                        reports.id,
                        reports.description,
                        reports.type,
                        reports.status,
                        reports.created_at,
                        reports.updated_at
                    FROM reports
                    WHERE reports.user_id = %s
                    ORDER BY reports.created_at DESC
                    """,
                    (str(user_id),),
                )
                reports = cur.fetchall()

        # Aggregate all fetched data into a single object
        user_details = {
            "id": user_info["id"],
            "name": user_info["name"],
            "email": user_info["email"],
            "pastBookings": past_bookings,
            "parkingSpaces": parking_spaces,
            "reports": reports,
        }

        return Ok(user_details)

    except Exception as e:
        return Err(f"Failed to fetch user details: {str(e)}")


def get_all_cancellations() -> Result[List[Dict[str, Any]], str]:
    """
    Fetch all cancellations from the reservations table where status is 'canceled'.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT
                        reservations.id as id,
                        reservations.status,
                        reservations.created_at,
                        reservations.updated_at,
                        users.name AS owner_name,
                        parking_spaces.name AS parking_space_name,
                        parking_spaces.address AS parking_space_address,
                        lower(reservations.time) AS start_time,
                        upper(reservations.time) AS end_time,
                        reservations.parking_space_id
                    FROM reservations
                    JOIN users ON reservations.renter_id = users.id
                    JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                    WHERE reservations.acknowledged = 'false' AND reservations.status = 'canceled'
                    ORDER BY reservations.created_at DESC
                    """
                )
                cancellations = cur.fetchall()

                # If no cancellations are found, return an empty list
                if not cancellations:
                    return Ok([])

                return Ok(cancellations)
    except Exception as e:
        return Err(f"Failed to fetch cancellations: {str(e)}")


def handle_acknowledge_cancellation(cancellation_id: uuid.UUID) -> Result[None, str]:
    """
    Mark a specific cancellation as acknowledged by updating its status in the reservations table and
    sending an acknowledgment email to the user.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Retrieve necessary information (renter_id, parking_space_name, address)
                cur.execute(
                    """
                    UPDATE reservations
                    SET acknowledged = 'true', updated_at = NOW()
                    WHERE id = %s AND acknowledged = 'false'
                    RETURNING renter_id, parking_space_id
                    """,
                    (str(cancellation_id),),
                )
                result = cur.fetchone()

                # Check if the cancellation was found and updated
                if not result:
                    return Err("Cancellation not found or already acknowledged.")

                renter_id = result["renter_id"]
                parking_space_id = result["parking_space_id"]

                # Fetch parking space details for email template
                cur.execute(
                    """
                    SELECT name AS parking_space_name, address AS parking_space_address
                    FROM parking_spaces
                    WHERE id = %s
                    """,
                    (str(parking_space_id),),
                )
                parking_space = cur.fetchone()
                if not parking_space:
                    return Err(
                        "Parking space details not found for the acknowledged cancellation."
                    )

                # Fetch renter's email and name for sending the email
                cur.execute(
                    """
                    SELECT name, email
                    FROM users
                    WHERE id = %s
                    """,
                    (str(renter_id),),
                )
                renter_info = cur.fetchone()
                if not renter_info:
                    return Err(
                        "User information not found for sending acknowledgment email."
                    )

                renter_name = renter_info["name"]
                renter_email = renter_info["email"]

        # Commit the acknowledgment update
        conn.commit()

        # Send acknowledgment email
        send_email(
            to=renter_email,
            subject="XPark Cancellation Acknowledgment",
            content=generate_templated_email(
                "cancel_response",
                name=renter_name,
                parking_space_name=parking_space["parking_space_name"],
                parking_space_address=parking_space["parking_space_address"],
            ),
        )
        return Ok(None)

    except Exception as e:
        return Err(f"Failed to acknowledge cancellation: {str(e)}")


def get_all_conflicts() -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    reports.id,
                    reports.reservation_id,
                    reports.user_id,
                    reporters.name AS reporter_name,
                    reports.description,
                    reports.type,
                    reports.status,
                    reports.admin_response,
                    reports.departure_time,
                    reports.overstay_duration,
                    reports.overstay_charge,
                    reports.damage_type,
                    reports.damage_severity,
                    reports.image_url,
                    reports.created_at,
                    reports.updated_at,
                    owners.name AS owner_name,
                    owners.id AS owner_id,
                    renters.name AS renter_name,
                    renters.id AS renter_id,
                    parking_spaces.name AS parking_space_name,
                    parking_spaces.address AS parking_space_address,
                    LOWER(reservations.time) AS start_time,
                    UPPER(reservations.time) AS end_time,
                    reservations.parking_space_id
                FROM reports
                LEFT JOIN reservations ON reports.reservation_id = reservations.id
                LEFT JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                LEFT JOIN users AS owners ON parking_spaces.owner = owners.id
                LEFT JOIN users AS renters ON reservations.renter_id = renters.id
                LEFT JOIN users AS reporters ON reports.user_id = reporters.id
                WHERE reports.status != 'resolved' -- Only get non-resolved reports
                ORDER BY reports.created_at DESC
                """
            )
            reports = cur.fetchall()
            return Ok(reports)


def update_conflict_response(
    conflict_id: uuid.UUID, response_text: str
) -> Result[Dict[str, Any], str]:
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
                (str(reservation_id),),
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
            admin_response=response_text,
        ),
    )

    return Ok(updated_conflict)


def get_all_pending_parking_spaces() -> Result[Dict[str, List[Dict[str, Any]]], str]:
    """
    Fetch all parking spaces that have a 'pending' verification status from the database,
    along with owner information.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            query = """
                SELECT
                    ps.id,
                    ps.name,
                    ps.is_paid,
                    ps.verification_status,
                    ST_Y(ps.location::geometry) AS latitude,
                    ST_X(ps.location::geometry) AS longitude,
                    ps.address,
                    ps.availability_schedule,
                    json_build_object(
                         'base_price', ps.price,
                         'dynamic_pricing', FALSE
                    ) as pricing_info,
                    ps.photos,
                    ps.verification_photos,
                    ps.created_at,
                    ps.owner,
                    ps.updated_at,
                    u.name AS owner_name,
                    u.email AS owner_email
                FROM parking_spaces ps
                JOIN users u ON ps.owner = u.id
                WHERE ps.verification_status = 'pending'
            """
            cur.execute(query)
            rows = cur.fetchall()

            return Ok({"pendingSpaces": rows})


def handle_verify_parking(
    parking_space_id: uuid.UUID, is_verified: bool
) -> Result[Dict[str, Any], str]:
    # Step 1: Fetch the owner (user ID) of the parking space
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            cur.execute(
                """
                SELECT owner FROM parking_spaces WHERE id = %s
                """,
                (str(parking_space_id),),
            )
            user_id_result = cur.fetchone()
            if not user_id_result:
                return Err(f"Parking space with ID {parking_space_id} not found.")

            user_id = user_id_result["owner"]  # Access user_id directly

    # Step 2: Update the parking space verification status
    verification_status = "verified" if is_verified else "rejected"

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
                return Err(
                    f"Failed to update the verification status of parking space with ID {parking_space_id}."
                )

    # Step 3: Fetch the user's name and email by user ID
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:  # Use dict_row here
            cur.execute(
                """
                SELECT name, email FROM users WHERE id = %s
                """,
                (str(user_id),),
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
                name=user_name,  # Use the fetched user's name
            ),
        )
    else:
        send_email(
            to=user_email,
            subject="Parking spot verification rejected",
            content=generate_templated_email(
                "spot_rejected",
                name=user_name,  # Use the fetched user's name
            ),
        )

    return Ok(updated_space)


def admin_delete_paid_parking_space(
    parking_space_id: uuid.UUID, reason: str
) -> Result[None, str]:
    """
    Delete a paid parking space and ensure notifications are sent before cascade deletion
    """
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # 1. First get ALL necessary information before any deletions
            cur.execute(
                """
                SELECT p.owner, p.is_paid, p.photos, p.name, u.email, u.name
                FROM parking_spaces p
                JOIN users u ON p.owner = u.id
                WHERE p.id = %s
                """,
                (parking_space_id,),
            )
            result = cur.fetchone()

            if not result:
                return Err("spot not found")

            owner_id, is_paid, photos, parking_space_name, owner_email, owner_name = (
                result
            )

            if not is_paid:
                return Err("not a paid spot")

            # Get future reservations information BEFORE deletion
            cur.execute(
                """
                SELECT DISTINCT 
                    r.id,
                    r.renter_id,
                    lower(r.time) as start_time,
                    upper(r.time) as end_time,
                    u.email as renter_email,
                    u.name as renter_name
                FROM reservations r
                JOIN users u ON r.renter_id = u.id
                WHERE r.parking_space_id = %s
                AND upper(r.time) > NOW()
                AND r.status = 'booked'
                """,
                (parking_space_id,),
            )
            future_reservations = cur.fetchall()

            notifications = []
            for reservation in future_reservations:
                _, _, start_time, end_time, renter_email, renter_name = reservation
                notifications.append(
                    {
                        "email": renter_email,
                        "name": renter_name,
                        "start_time": start_time,
                        "end_time": end_time,
                    }
                )

            # 2. Now do the deletion (will cascade to all related tables)
            cur.execute("DELETE FROM parking_spaces WHERE id = %s", (parking_space_id,))

            # 3. Clean up photos
            if photos:
                for photo in photos:
                    image_path = os.path.join(
                        os.environ.get("BASE_FOLDER")
                        or os.path.abspath(os.path.dirname(__file__)),
                        photo.lstrip("/"),
                    )
                    if os.path.exists(image_path):
                        os.remove(image_path)

            # 4. Send all notifications after successful deletion
            for notification in notifications:
                email_content = generate_templated_email(
                    "reservation_spot_deleted",
                    name=notification["name"],
                    parking_space_name=parking_space_name,
                    start_time=notification["start_time"].strftime("%Y-%m-%d %H:%M %Z"),
                    end_time=notification["end_time"].strftime("%Y-%m-%d %H:%M %Z"),
                    cancel_reason=reason,
                )
                send_email(
                    to=notification["email"],
                    subject="Your Parking Reservation Has Been Cancelled",
                    content=email_content,
                )

            # Send to owner
            owner_email_content = generate_templated_email(
                "spot_deleted",
                owner_name=owner_name,
                parking_space_name=parking_space_name,
                reason=reason,
            )

            send_email(
                to=owner_email,
                subject="Your Parking Space Has Been Removed",
                content=owner_email_content,
            )

            return Ok(None)


def get_raffle_entries() -> Result[List[Dict[str, Any]], str]:
    """
    Fetch all raffle entries from the points_transaction table where description contains 'Raffle ticket purchase'.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT
                        users.id AS user_id,
                        users.name AS username,
                        users.email AS email,
                        COUNT(points_transaction.transaction_id) AS tickets
                    FROM points_transaction
                    JOIN users ON points_transaction.user_id = users.id
                    WHERE points_transaction.description LIKE 'Raffle ticket purchase%%'
                    AND points_transaction.status = 'active'
                    GROUP BY users.id, users.name
                    ORDER BY tickets DESC
                    """
                )
                raffle_entries = cur.fetchall()

                return Ok(raffle_entries)
    except Exception as e:
        return Err(f"Failed to fetch raffle entries: {str(e)}")


def perform_raffle() -> Result[List[Dict[str, Any]], str]:
    """
    Perform the raffle by randomly selecting a winner from the raffle entries.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT
                        users.id AS user_id,
                        users.name AS username,
                        users.email AS email,
                        COUNT(points_transaction.transaction_id) AS tickets
                    FROM points_transaction
                    JOIN users ON points_transaction.user_id = users.id
                    WHERE points_transaction.description LIKE 'Raffle ticket purchase%%'
                    AND points_transaction.status = 'active'
                    GROUP BY users.id, users.name
                    ORDER BY tickets DESC
                    """
                )
                raffle_entries = cur.fetchall()

                if not raffle_entries:
                    return Err("No raffle entries found")

                # Create a list of user IDs weighted by the number of tickets
                weighted_entries = []
                for entry in raffle_entries:
                    weighted_entries.extend([entry] * entry["tickets"])

                # Perform the raffle (randomly select a winner)
                winner = random.choice(weighted_entries)

                # Update the status of the raffle tickets to 'inactive'
                cur.execute(
                    """
                    UPDATE points_transaction
                    SET status = 'inactive'
                    WHERE status = 'active' AND description LIKE 'Raffle ticket purchase%%'
                    """
                )

                # Can someone figure this out?
                send_email(
                    to=winner["email"],
                    subject="Congratulations! You've Won the XPark Raffle",
                    content=generate_templated_email(
                        "raffle_winner", name=winner["username"], amount="$10"
                    ),
                )

                return Ok([winner])
    except Exception as e:
        return Err(f"Failed to perform raffle: {str(e)}")
