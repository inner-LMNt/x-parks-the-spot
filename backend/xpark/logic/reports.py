# src/features/reports/logic.py
from typing import Any, Dict, List
from uuid import UUID
from psycopg.rows import dict_row
from result import Err, Ok, Result
from xpark.utils.db import DB

def get_user_reports_logic(user_id: UUID) -> Result[List[Dict[str, Any]], str]:
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
                WHERE reservations.renter_id = %(user_id)s
                ORDER BY reports.created_at DESC
                """,
                {"user_id": user_id}
            )
            reports = cur.fetchall()
            return Ok(reports)


def create_report_logic(user_id: UUID, reservation_id: UUID, report_type: str, description: str) -> (
        Result)[Dict[str, Any] | None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO reports (
                    reservation_id,
                    description,
                    type,
                    status
                )
                VALUES (%(reservation_id)s, %(description)s, %(type)s, %(status)s)
                RETURNING id
                """,
                {
                    "reservation_id": reservation_id,
                    "description": description,
                    "type": report_type,
                    "status": "open"
                }
            )
            fetched = cur.fetchone()
            new_report_id = "" if fetched is None else fetched["id"]

            cur.execute("""
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
                            WHERE reports.id = %s
                            """, (new_report_id,))
            new_space = cur.fetchone()
            return Ok(new_space)

def get_report_by_id_logic(report_id: UUID, user_id: UUID) -> Result[Dict[str, Any], str]:
    """
    Fetch a specific report by ID for a user.
    """
    print(f"Fetching report with report_id: {report_id} for user_id: {user_id}")

    with DB.pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT 
                reports.id, 
                reports.reservation_id,
                reports.description,
                reports.type,
                reports.status,
                reports.admin_response,
                reports.created_at,
                reports.updated_at,
                owners.name as owner_name,
                parking_spaces.name as parking_space_name,
                parking_spaces.address as parking_space_address,
                lower(reservations.time) as start_time, 
                upper(reservations.time) as end_time, 
                reservations.parking_space_id
            FROM reports 
            JOIN reservations ON reports.reservation_id = reservations.id
            JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
            JOIN users owners ON parking_spaces.owner = owners.id
            WHERE reports.id = %(report_id)s AND reservations.renter_id = %(user_id)s
            """, {"report_id": report_id, "user_id": user_id})

        report = cur.fetchone()
        print(f"Report found: {report}" if report else "No report found.")
        return Ok(report) if report else Err("Report not found.")


def update_report_admin_response_logic(report_id: UUID, admin_response: str, user_id: UUID) -> Result[Dict[str, Any], str]:
    """
    Update the admin response for a specific report.
    """
    print(f"Updating admin response for report_id: {report_id}, user_id: {user_id}")
    if not admin_response:
        return Err("Admin response cannot be empty.")

    with DB.pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            WITH updated AS (
                UPDATE reports 
                SET admin_response = %(admin_response)s, 
                    status = 'resolved', 
                    updated_at = NOW()
                FROM reservations
                WHERE reports.id = %(report_id)s 
                AND reports.reservation_id = reservations.id
                AND reservations.renter_id = %(user_id)s
                RETURNING reports.*
            )
            SELECT 
                updated.*, 
                parking_spaces.name as parking_space_name,
                owners.name as owner_name,
                parking_spaces.address as parking_space_address,
                lower(reservations.time) as start_time,
                upper(reservations.time) as end_time,
                reservations.parking_space_id
            FROM updated
            JOIN reservations ON updated.reservation_id = reservations.id
            JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
            JOIN users owners ON parking_spaces.owner = owners.id
        """, {
            "admin_response": admin_response,
            "report_id": report_id,
            "user_id": user_id
        })

        updated_report = cur.fetchone()
        print(f"Updated report: {updated_report}" if updated_report else "No report found or unauthorized update.")
        return Ok(updated_report) if updated_report else Err("Report not found or not authorized to update.")
