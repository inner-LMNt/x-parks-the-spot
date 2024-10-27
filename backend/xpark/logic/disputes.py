import uuid
from typing import List, Dict, Any, Optional, Union
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err

# Function to retrieve all disputes filed by a specific user
def get_all_disputes() -> Union[Ok[List[Dict[str, Any]]], Err]:
    """
    Retrieves all disputes in the system.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                query = """
                    SELECT id, user_id, parking_space_id, dispute_type, message, status, created_at
                    FROM disputes
                    WHERE status = 'pending'
                """
                cur.execute(query)
                disputes = cur.fetchall()

                if disputes:
                    # Convert each dispute row to a dictionary for consistency
                    disputes_list = [dict(dispute) for dispute in disputes]
                    return Ok(disputes_list)
                else:
                    return Err("No disputes found.")
    except Exception as e:
        return Err(f"Failed to fetch disputes: {str(e)}")


# Function to create a new dispute
def add_dispute(user_id: uuid.UUID, dispute_type: str, message: str, parking_space_id: Optional[uuid.UUID] = None) -> Union[Ok[Dict[str, Any]], Err]:
    """
    Adds a new dispute for the user.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                query = """
                    INSERT INTO disputes (user_id, parking_space_id, dispute_type, message, status, created_at)
                    VALUES (%s, %s, %s, %s, 'pending', NOW())
                    RETURNING id, user_id, parking_space_id, dispute_type, message, status, created_at
                """
                cur.execute(
                    query,
                    (str(user_id), str(parking_space_id) if parking_space_id else None, dispute_type, message)
                )
                dispute = cur.fetchone()

                if dispute:
                    return Ok(dict(dispute))  # Convert to dictionary for uniformity
                else:
                    return Err("Failed to add dispute.")
    except Exception as e:
        return Err(f"Error adding dispute: {str(e)}")


# Function to resolve a dispute
def resolve_dispute(dispute_id: uuid.UUID) -> Union[Ok[Dict[str, Any]], Err]:
    """
    Marks a dispute as resolved.
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
