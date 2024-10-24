from typing import Dict, Any
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
import datetime


def add_paid_parking_space_time(
    user_id: uuid.UUID,
    spot_id: uuid.UUID,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Insert only if the user owns the parking space
            cur.execute(
                """
            INSERT INTO availability (
                parking_space_id,
                start_time,
                end_time
            )
            VALUES (%(spot_id)s, %(start_time)s, %(end_time)s)
            WHERE EXISTS (
                SELECT 1 from parking_spaces
                    WHERE id = %(spot_id)s AND owner = %(user_id)s
            ) RETURNING id
            """,
                {
                    "spot_id": spot_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "user_id": user_id,
                },
            )
            new_id_t = cur.fetchone()
            if not new_id_t:
                return Err("Unable to insert availability time")

            return Ok(new_id_t[0])


def delete_paid_parking_space_time(
    user_id: uuid.UUID,
    timeslot_id: uuid.UUID,
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Delete only if the user owns the parking space
            cur.execute(
                """
            DELETE FROM availability
            WHERE 
                id = %(timeslot_id)s
                AND EXISTS (
                    SELECT 1 from parking_spaces
                    WHERE id = availability.parking_space_id AND owner = %(user_id)s
                )
            """,
                {
                    "timeslot_id": timeslot_id,
                    "user_id": user_id,
                },
            )
            return Ok(None)


def list_paid_parking_space_times(
    user_id: uuid.UUID,
    spot_id: uuid.UUID,
) -> Result[list[Dict[Any, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                    SELECT
                        start_time,
                        end_time
                    FROM reservations JOIN parking_spaces ON parking_spaces.id = reservations.parking_space_id
                    WHERE parking_space.owner = %(user_id)s
                    AND   parking_space.id = %(spot_id)s
                        
                """,
                {
                    "spot_id": spot_id,
                    "user_id": user_id,
                },
            )
            list_of_times = cur.fetchall()
            return Ok(list_of_times)
