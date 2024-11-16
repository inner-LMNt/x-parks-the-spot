from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from psycopg.rows import dict_row
from result import Err, Ok, Result

from xpark.utils.db import DB


def get_user_reports_logic(user_id: UUID) -> Result[List[Dict[str, Any]], str]:
    """
    Fetch all reports associated with the user.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Query to fetch all reports where the user is either the reporter or the renter
            cur.execute(
                """
                SELECT 
                    reports.id, 
                    reports.reservation_id,
                    reports.user_id,
                    reports.description,
                    reports.type,
                    reports.status,
                    reports.admin_response,
                    reports.created_at,
                    reports.updated_at,
                    reports.departure_time,
                    reports.overstay_duration,
                    reports.overstay_charge,
                    reports.damage_type,
                    reports.damage_severity,
                    reports.image_url,
                    owners.name AS owner_name,
                    parking_spaces.name AS parking_space_name,
                    parking_spaces.address AS parking_space_address,
                    LOWER(reservations.time) AS start_time, 
                    UPPER(reservations.time) AS end_time, 
                    reservations.parking_space_id
                FROM reports
                LEFT JOIN reservations ON reports.reservation_id = reservations.id
                LEFT JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                LEFT JOIN users AS owners ON parking_spaces.owner = owners.id
                WHERE reports.user_id = %(user_id)s
                ORDER BY reports.created_at DESC
                """,
                {"user_id": user_id}
            )
            reports = cur.fetchall()
            return Ok(reports)

def create_reservation_issue_report_logic(
    user_id: UUID,
    reservation_id: UUID,
    report_type: str,
    description: str
) -> Result[Dict[str, Any], str]:
    """
    Logic for creating a reservation issue report.
    Includes the parking space's photo URL from the associated parking space.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # First fetch the reservation and associated parking space photo
            cur.execute(
                """
                SELECT 
                    reservations.id,
                    parking_spaces.photos
                FROM reservations
                JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                WHERE reservations.id = %(reservation_id)s
                """,
                {"reservation_id": reservation_id}
            )
            result = cur.fetchone()
            if not result:
                return Err("Reservation not found.")

            cur.execute(
                """
                INSERT INTO reports (
                    user_id,
                    reservation_id,
                    description,
                    type,
                    status,
                    image_url
                )
                VALUES (
                    %(user_id)s,
                    %(reservation_id)s,
                    %(description)s,
                    %(type)s,
                    %(status)s,
                    %(image_url)s
                )
                RETURNING
                    id,
                    reservation_id,
                    user_id,
                    description,
                    type,
                    status,
                    image_url,
                    created_at,
                    updated_at
                """,
                {
                    "user_id": user_id,
                    "reservation_id": reservation_id,
                    "description": description,
                    "type": report_type,
                    "status": "open",
                    "image_url": result['photos'][0]
                },
            )
            new_report = cur.fetchone()
            return Ok(new_report) if new_report else Err("Failed to create report")

def create_renter_overstay_report_logic(
    user_id: UUID,
    reservation_id: UUID,
    report_type: str,
    description: str,
    departure_time: datetime,
    image_url: Optional[str]
) -> Result[Dict[str, Any], str]:
    """
    Logic for creating a renter overstay report.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Fetch reservation details
            cur.execute(
                """
                SELECT 
                    LOWER(time) AS start_time,
                    UPPER(time) AS end_time,
                    price
                FROM reservations
                WHERE id = %(reservation_id)s
                """,
                {"reservation_id": reservation_id}
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found.")

            reservation_end_time = reservation['end_time']
            reservation_start_time = reservation['start_time']
            reservation_price = reservation['price']

            # Convert both times to UTC
            departure_time = departure_time.astimezone(timezone.utc)
            reservation_end_time = reservation_end_time.astimezone(timezone.utc)
            reservation_start_time = reservation_start_time.astimezone(timezone.utc)

            # Calculate overstay_duration in minutes
            overstay_duration = int((departure_time - reservation_end_time).total_seconds() / 60)

            # Calculate hourly rate
            reservation_duration_hours = (reservation_end_time - reservation_start_time).total_seconds() / 3600
            hourly_rate = reservation_price / reservation_duration_hours

            # Calculate overstay charge
            overstay_charge = (hourly_rate * 1.5 / 60) * overstay_duration  # Charge per minute

            # Insert into reports and return specific fields
            cur.execute(
                """
                INSERT INTO reports (
                    user_id,
                    reservation_id,
                    description,
                    type,
                    status,
                    departure_time,
                    overstay_duration,
                    overstay_charge,
                    image_url
                )
                VALUES (
                    %(user_id)s,
                    %(reservation_id)s,
                    %(description)s,
                    %(type)s,
                    %(status)s,
                    %(departure_time)s,
                    %(overstay_duration)s,
                    %(overstay_charge)s,
                    %(image_url)s
                )
                RETURNING
                    id,
                    reservation_id,
                    user_id,
                    description,
                    type,
                    status,
                    departure_time,
                    overstay_duration,
                    overstay_charge,
                    image_url,
                    created_at,
                    updated_at
                """,
                {
                    "user_id": user_id,
                    "reservation_id": reservation_id,
                    "description": description,
                    "type": report_type,
                    "status": "open",
                    "departure_time": departure_time,
                    "overstay_duration": overstay_duration,
                    "overstay_charge": overstay_charge,
                    "image_url": image_url
                }
            )
            new_report = cur.fetchone()
            return Ok(new_report) if new_report else Err("Failed to create report")

def create_damage_report_logic(
    user_id: UUID,
    reservation_id: UUID,
    report_type: str,
    description: str,
    damage_type: str,
    damage_severity: str,
    image_url: Optional[str]
) -> Result[Dict[str, Any], str]:
    """
    Logic for creating a damage report.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 1
                FROM reservations
                WHERE id = %(reservation_id)s
                """,
                {"reservation_id": reservation_id}
            )
            if not cur.fetchone():
                return Err("Reservation not found.")

            cur.execute(
                """
                INSERT INTO reports (
                    user_id,
                    reservation_id,
                    description,
                    type,
                    status,
                    damage_type,
                    damage_severity,
                    image_url
                )
                VALUES (
                    %(user_id)s,
                    %(reservation_id)s,
                    %(description)s,
                    %(type)s,
                    %(status)s,
                    %(damage_type)s,
                    %(damage_severity)s,
                    %(image_url)s
                )
                RETURNING
                    id,
                    reservation_id,
                    user_id,
                    description,
                    type,
                    status,
                    damage_type,
                    damage_severity,
                    image_url,
                    created_at,
                    updated_at
                """,
                {
                    "user_id": user_id,
                    "reservation_id": reservation_id,
                    "description": description,
                    "type": report_type,
                    "status": "open",
                    "damage_type": damage_type,
                    "damage_severity": damage_severity,
                    "image_url": image_url
                }
            )
            new_report = cur.fetchone()
            return Ok(new_report) if new_report else Err("Failed to create report")


def create_other_issue_report_logic(
    user_id: UUID,
    report_type: str,
    description: str
) -> Result[Dict[str, Any], str]:
    """
    Logic for creating an 'Other' issue report without a reservation ID.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:

            cur.execute(
                """
                INSERT INTO reports (
                    user_id,
                    description,
                    type,
                    status
                )
                VALUES (
                    %(user_id)s,
                    %(description)s,
                    %(type)s,
                    %(status)s
                )
                RETURNING
                    id,
                    user_id,
                    description,
                    type,
                    status,
                    created_at,
                    updated_at
                """,
                {
                    "user_id": user_id,
                    "description": description,
                    "type": report_type,
                    "status": "open"
                }
            )
            new_report = cur.fetchone()
            return Ok(new_report) if new_report else Err("Failed to create report")


def get_report_by_id_logic(report_id: UUID, user_id: UUID) -> Result[Dict[str, Any], str]:
    """
    Fetch a specific report by ID for a user.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    reports.id, 
                    reports.reservation_id,
                    reports.user_id,
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
                    renters.name AS renter_name,
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
                WHERE reports.id = %(report_id)s AND reports.user_id = %(user_id)s
                """,
                {"report_id": report_id, "user_id": user_id}
            )
            report = cur.fetchone()
            if not report:
                return Err("Report not found or not authorized to view.")
            return Ok(report)


def update_report_admin_response_logic(report_id: UUID, admin_response: str, user_id: UUID) -> Result[Dict[str, Any], str]:
    """
    Update the admin response for a specific report.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                WITH updated AS (
                    UPDATE reports 
                    SET admin_response = %(admin_response)s, 
                        status = 'resolved', 
                        updated_at = NOW()
                    WHERE id = %(report_id)s
                    RETURNING *
                )
                SELECT 
                    updated.*, 
                    owners.name AS owner_name,
                    parking_spaces.name AS parking_space_name,
                    parking_spaces.address AS parking_space_address,
                    LOWER(reservations.time) AS start_time,
                    UPPER(reservations.time) AS end_time,
                    reservations.parking_space_id
                FROM updated
                LEFT JOIN reservations ON updated.reservation_id = reservations.id
                LEFT JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                LEFT JOIN users AS owners ON parking_spaces.owner = owners.id
                WHERE updated.user_id = %(user_id)s OR reservations.renter_id = %(user_id)s
                """,
                {
                    "admin_response": admin_response,
                    "report_id": report_id,
                    "user_id": user_id
                }
            )
            updated_report = cur.fetchone()
            return Ok(updated_report) if updated_report else Err("Report not found or not authorized to update.")
