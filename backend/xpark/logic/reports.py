# src/features/reports/logic.py

from typing import Any, Dict, List
from uuid import UUID
from psycopg.rows import dict_row
from result import Err, Ok, Result
from xpark.utils.db import DB


def get_user_reports_logic(user_id: UUID) -> Result[List[Dict[str, Any]], str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT 
                        reports.*, 
                        reservations.start_time, 
                        reservations.end_time, 
                        reservations.parking_space_id
                    FROM reports
                    JOIN reservations ON reports.reservation_id = reservations.id
                    WHERE reports.renter_id = %(user_id)s
                    ORDER BY reports.created_at DESC
                    """,
                    {"user_id": user_id}
                )
                reports = cur.fetchall()
                return Ok(reports)
    except Exception as e:
        return Err(f"Error fetching reports for user_id {user_id}: {str(e)}")


def create_report_logic(user_id: UUID, reservation_id: UUID, type: str, description: str) -> Result[Dict[str, Any], str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    INSERT INTO reports (
                        renter_id,
                        reservation_id,
                        description,
                        start_time,
                        end_time,
                        parking_space_id,
                        owner_id,
                        car_info_id,
                        type,
                        status,
                        created_at,
                        updated_at
                    )
                    SELECT
                        %(renter_id)s,
                        %(reservation_id)s,
                        %(description)s,
                        reservations.start_time,
                        reservations.end_time,
                        reservations.parking_space_id,
                        (SELECT owner FROM parking_spaces WHERE id = reservations.parking_space_id) AS owner_id,
                        reservations.car_info_id,
                        %(type)s,
                        %(status)s,
                        NOW(),
                        NOW()
                    FROM reservations
                    WHERE reservations.id = %(reservation_id)s
                    RETURNING *
                    """,
                    {
                        "renter_id": user_id,
                        "reservation_id": reservation_id,
                        "description": description,
                        "type": type,
                        "status": "open"
                    }
                )
                new_report = cur.fetchone()
                return Ok(new_report)
    except Exception as e:
        print(f"Error creating report for user_id {user_id}, reservation_id {reservation_id}: {str(e)}")
        return Err(f"Error creating report for user_id {user_id}, reservation_id {reservation_id}: {str(e)}")



def get_report_by_id_logic(report_id: UUID, user_id: UUID) -> Result[Dict[str, Any], str]:
    """
    Fetch a specific report by ID for a user.
    """
    print(f"Fetching report with report_id: {report_id} for user_id: {user_id}")
    if not (isinstance(report_id, UUID) and isinstance(user_id, UUID)):
        return Err("Invalid UUID format for report_id or user_id.")

    try:
        with DB.pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT reports.*, reservations.parking_space_name 
                FROM reports
                JOIN reservations ON reports.reservation_id = reservations.id
                WHERE reports.id = %(report_id)s AND reports.renter_id = %(user_id)s
            """, {"report_id": report_id, "user_id": user_id})

            report = cur.fetchone()
            print(f"Report found: {report}" if report else "No report found.")
            return Ok(report) if report else Err("Report not found.")
    except Exception as e:
        print(f"Error fetching report with report_id {report_id} for user_id {user_id}: {e}")
        return Err(f"Error fetching report: {str(e)}")


def update_report_admin_response_logic(report_id: UUID, admin_response: str, user_id: UUID) -> Result[
    Dict[str, Any], str]:
    """
    Update the admin response for a specific report.
    """
    print(f"Updating admin response for report_id: {report_id}, user_id: {user_id}")
    if not admin_response:
        return Err("Admin response cannot be empty.")
    if not (isinstance(report_id, UUID) and isinstance(user_id, UUID)):
        return Err("Invalid UUID format for report_id or user_id.")

    try:
        with DB.pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                WITH updated AS (
                    UPDATE reports 
                    SET admin_response = %(admin_response)s, status = 'resolved', updated_at = NOW()
                    WHERE id = %(report_id)s AND renter_id = %(user_id)s
                    RETURNING *
                )
                SELECT updated.*, reservations.parking_space_name 
                FROM updated
                JOIN reservations ON updated.reservation_id = reservations.id
            """, {"admin_response": admin_response, "report_id": report_id, "user_id": user_id})

            updated_report = cur.fetchone()
            print(f"Updated report: {updated_report}" if updated_report else "No report found or unauthorized update.")
            return Ok(updated_report) if updated_report else Err("Report not found or not authorized to update.")
    except Exception as e:
        print(f"Error updating report for report_id {report_id}, user_id {user_id}: {e}")
        return Err(f"Error updating report: {str(e)}")
