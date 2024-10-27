from typing import Dict, Any
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
import datetime
from psycopg import Cursor


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
            INSERT INTO paid_parking_allowed_availability (
                parking_space_id,
                time
            )
            SELECT %(spot_id)s, TSTZRANGE(%(start_time)s, %(end_time)s, '[]')
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

            recalculate_coalesce(cur, spot_id)

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
            DELETE FROM paid_parking_allowed_availability
            WHERE 
                id = %(timeslot_id)s
                AND EXISTS (
                    SELECT 1 from parking_spaces
                    WHERE id = availability.parking_space_id AND owner = %(user_id)s
                )
            RETURNING parking_space_id
            """,
                {
                    "timeslot_id": timeslot_id,
                    "user_id": user_id,
                },
            )

            del_id_t = cur.fetchone()
            if not del_id_t:
                return Err("Unable to delete availability time")

            recalculate_coalesce(cur, del_id_t[0])

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
                        lower(time) as start_time,
                        upper(time) as end_time
                    FROM paid_parking_allowed_availability
                    JOIN parking_spaces ON
                        parking_spaces.id = paid_parking_allowed_availability.parking_space_id
                    WHERE parking_spaces.owner = %(user_id)s
                    AND   parking_spaces.id = %(spot_id)s
                        
                """,
                {
                    "spot_id": spot_id,
                    "user_id": user_id,
                },
            )
            list_of_times = cur.fetchall()
            return Ok(list_of_times)


# We have this take a cursor because we want this to only be called from the functions above
# Since it takes a cursor, it's gonna happen in the same transaction
# Unless if a transaction is explicitly started/ended
def recalculate_coalesce(cur: Cursor, spot_id: uuid.UUID) -> None:
    # Delete and recalculate coalesced time for parking spot
    cur.execute(
        """
        DELETE FROM timetable_coalesce WHERE parking_space_id = %(space_id)s;
    """,
        {"space_id": spot_id},
    )

    cur.execute(
        """
        INSERT INTO timetable_coalesce (parking_space_id, time) VALUES (
            %(space_id)s,
            coalesce_timetable_by_parking_space_id(%(space_id)s)
        );
    """,
        {"space_id": spot_id},
    )
