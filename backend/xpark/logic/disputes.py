import uuid
from typing import List, Dict, Any, Optional, Union
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err

# Function to retrieve all disputes
def get_all_disputes() -> Union[Ok[List[Dict[str, Any]]], Err]:
    """
    Retrieves all disputes in the system along with linked parking space details.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Query with JOIN to fetch both dispute and parking space details
                query = """
                    SELECT
                        d.id AS dispute_id,
                        d.user_id,
                        d.parking_space_id,
                        d.dispute_type,
                        d.message,
                        d.status,
                        d.created_at,
                        p.id AS parking_space_id,
                        p.owner AS parking_space_owner_id,
                        p.is_paid,
                        p.name AS parking_space_name,
                        ST_X(p.location::geometry) AS longitude,
                        ST_Y(p.location::geometry) AS latitude,
                        p.features,
                        p.availability_schedule,
                        p.pricing_info,
                        p.photos,
                        p.verification_status,
                        p.dynamic_pricing_enabled,
                        p.cancellation_policy,
                        p.created_at AS parking_created_at,
                        p.updated_at AS parking_updated_at
                    FROM disputes d
                    LEFT JOIN parking_spaces p ON d.parking_space_id = p.id
                    WHERE d.status = 'pending'
                """
                cur.execute(query)
                disputes = cur.fetchall()

                # Process results to a list of dictionaries
                disputes_list = []
                for dispute in disputes:
                    # Structure each dispute with optional parking space details
                    disputes_list.append({
                        "id": dispute["dispute_id"],
                        "user_id": dispute["user_id"],
                        "dispute_type": dispute["dispute_type"],
                        "message": dispute["message"],
                        "status": dispute["status"],
                        "created_at": dispute["created_at"].isoformat(),
                        "parking_space": {
                            "id": str(dispute["parking_space_id"]) if dispute["parking_space_id"] else None,
                            "owner_id": str(dispute["parking_space_owner_id"]) if dispute["parking_space_owner_id"] else None,
                            "is_paid": dispute["is_paid"],
                            "name": dispute["parking_space_name"],
                            "location": {
                                "latitude": dispute["latitude"],
                                "longitude": dispute["longitude"],
                            } if dispute["latitude"] and dispute["longitude"] else None,
                            "features": dispute["features"],
                            "availability_schedule": dispute["availability_schedule"],
                            "pricing_info": dispute["pricing_info"],
                            "photos": dispute["photos"],
                            "verification_status": dispute["verification_status"],
                            "dynamic_pricing_enabled": dispute["dynamic_pricing_enabled"],
                            "cancellation_policy": dispute["cancellation_policy"],
                            "created_at": dispute["parking_created_at"].isoformat() if dispute["parking_created_at"] else None,
                            "updated_at": dispute["parking_updated_at"].isoformat() if dispute["parking_updated_at"] else None,
                        } if dispute["parking_space_id"] else None,
                    })

                return Ok(disputes_list) if disputes_list else Err("No disputes found.")
    except Exception as e:
        return Err(f"Failed to fetch disputes: {str(e)}")


def add_dispute(user_id: uuid.UUID, dispute_type: str, message: str, reservation_id: Optional[uuid.UUID] = None, parking_space_id: Optional[uuid.UUID] = None) -> Union[Ok[Dict[str, Any]], Err]:
    """
    Adds a new dispute for the user. If the dispute type is 'cancellation', updates the reservation status to 'pending_cancellation'.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Insert dispute record
                query = """
                    INSERT INTO disputes (user_id, reservation_id, parking_space_id, dispute_type, message, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
                    RETURNING id, user_id, reservation_id, parking_space_id, dispute_type, message, status, created_at
                """
                cur.execute(query, (str(user_id), str(reservation_id), str(parking_space_id), dispute_type, message))
                dispute = cur.fetchone()

                # Update reservation status if dispute type is cancellation
                if dispute_type == "cancellation" and reservation_id:
                    update_query = """
                        UPDATE reservations
                        SET status = 'pending_cancellation'
                        WHERE id = %s
                    """
                    cur.execute(update_query, (str(reservation_id),))

                if dispute:
                    return Ok(dict(dispute))
                else:
                    return Err("Failed to add dispute.")

    except Exception as e:
        return Err(f"Error adding dispute: {str(e)}")




# Function to resolve a dispute
def resolve_dispute(dispute_id: uuid.UUID) -> Union[Ok[Dict[str, Any]], Err]:
    """
    Marks a dispute as resolved.create
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                query = """
                    UPDATE disputes
                    SET status = 'resolved'
                    WHERE id = %s
                    RETURNING id, user_id, parking_space_id, dispute_type, message, status, created_at
                """
                cur.execute(query, (str(dispute_id),))
                dispute = cur.fetchone()

                if dispute:
                    return Ok(dict(dispute))  # Return as dictionary for consistency
                else:
                    return Err("Dispute not found or could not be resolved.")
    except Exception as e:
        return Err(f"Error resolving dispute: {str(e)}")
