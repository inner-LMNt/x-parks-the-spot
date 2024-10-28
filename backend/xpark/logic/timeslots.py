from typing import Dict, Any, List
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
import datetime
import zoneinfo
from psycopg import Cursor
from psycopg.rows import DictRow, TupleRow


def days_of_week_to_slots(
    cur: Cursor[DictRow | TupleRow], spot_id: uuid.UUID, schedule: List[Dict[str, str]]
) -> None:
    # First, take the days of the week, calculate the days, and fill them out for the year or something
    # Then, grow those timeslots by 1 minute in each direction.
    # Then, insert those timeslots
    # Then, coalesce

    # This is so stupid
    # Deleting the entries and recalculating it.
    # Twice.
    # Whatever.
    cur.execute(
        """
        DELETE FROM paid_parking_allowed_availability WHERE parking_space_id = %(space_id)s;
    """,
        {"space_id": spot_id},
    )

    # Convert times into timeslices
    for sched_item in schedule:
        # Convert day of week into an integer representing the day of the week
        day_of_week = {
            "Monday": 0,
            "Tuesday": 1,
            "Wednesday": 2,
            "Thursday": 3,
            "Friday": 4,
            "Saturday": 5,
            "Sunday": 6,
        }[sched_item["day_of_week"]]

        start_time_str = sched_item["start_time"]
        start_time_hour, start_time_minute = [int(x) for x in start_time_str.split(":")]
        end_time_str = sched_item["end_time"]
        end_time_hour, end_time_minute = [int(x) for x in end_time_str.split(":")]

        # Uhh, timezones aren't sent from the client
        # Guess I'll just guess then
        # FIXME timezones
        # First find the next 52 dates with the selected day of the week
        today = datetime.datetime.now(tz=zoneinfo.ZoneInfo("America/New_York"))
        today_day = today.weekday()
        next_day = day_of_week - today_day
        for i in range(0, 52):
            # Day has not happened yet (or is still happening)
            day = today + datetime.timedelta(days=i * 7 + next_day)
            # Set the start time and end time for that day
            start_time_small = day.replace(
                hour=start_time_hour,
                minute=start_time_minute,
                second=0,
                microsecond=0,
            )
            end_time_small = day.replace(
                hour=end_time_hour, minute=end_time_minute, second=0, microsecond=0
            )
            # Grow time by one minute in each direction (to handle seconds drift)
            # We can't subtract the minute value above, because it may be zero, and negative minutes is bad
            start_time = start_time_small + datetime.timedelta(minutes=-1)
            end_time = end_time_small + datetime.timedelta(minutes=2)

            # Insert calculated date into timezone
            cur.execute(
                """
                INSERT INTO paid_parking_allowed_availability (parking_space_id, time) VALUES (
                    %(space_id)s,
                    TSTZRANGE(%(start_time)s, %(end_time)s, '[]')
                );
            """,
                {
                    "space_id": spot_id,
                    "start_time": start_time,
                    "end_time": end_time,
                },
            )


# def add_paid_parking_space_time(
#     user_id: uuid.UUID,
#     spot_id: uuid.UUID,
#     start_time: datetime.datetime,
#     end_time: datetime.datetime,
# ) -> Result[uuid.UUID, str]:
#     with DB.pool.connection() as conn:
#         with conn.cursor() as cur:
#             # Insert only if the user owns the parking space
#             cur.execute(
#                 """
#             INSERT INTO paid_parking_allowed_availability (
#                 parking_space_id,
#                 time
#             )
#             SELECT %(spot_id)s, TSTZRANGE(%(start_time)s, %(end_time)s, '[]')
#             WHERE EXISTS (
#                 SELECT 1 from parking_spaces
#                     WHERE id = %(spot_id)s AND owner = %(user_id)s
#             ) RETURNING id
#             """,
#                 {
#                     "spot_id": spot_id,
#                     "start_time": start_time,
#                     "end_time": end_time,
#                     "user_id": user_id,
#                 },
#             )
#             new_id_t = cur.fetchone()
#             if not new_id_t:
#                 return Err("Unable to insert availability time")
#
#             recalculate_coalesce(cur, spot_id)
#
#             return Ok(new_id_t[0])
#

# def delete_paid_parking_space_time(
#     user_id: uuid.UUID,
#     timeslot_id: uuid.UUID,
# ) -> Result[None, str]:
#     with DB.pool.connection() as conn:
#         with conn.cursor() as cur:
#             # Delete only if the user owns the parking space
#             cur.execute(
#                 """
#             DELETE FROM paid_parking_allowed_availability
#             WHERE
#                 id = %(timeslot_id)s
#                 AND EXISTS (
#                     SELECT 1 from parking_spaces
#                     WHERE id = availability.parking_space_id AND owner = %(user_id)s
#                 )
#             RETURNING parking_space_id
#             """,
#                 {
#                     "timeslot_id": timeslot_id,
#                     "user_id": user_id,
#                 },
#             )
#
#             del_id_t = cur.fetchone()
#             if not del_id_t:
#                 return Err("Unable to delete availability time")
#
#             recalculate_coalesce(cur, del_id_t[0])
#
#             return Ok(None)
#
#
# def list_paid_parking_space_times(
#     user_id: uuid.UUID,
#     spot_id: uuid.UUID,
# ) -> Result[list[Dict[Any, Any]], str]:
#     with DB.pool.connection() as conn:
#         with conn.cursor(row_factory=dict_row) as cur:
#             cur.execute(
#                 """
#                     SELECT
#                         lower(time) as start_time,
#                         upper(time) as end_time
#                     FROM paid_parking_allowed_availability
#                     JOIN parking_spaces ON
#                         parking_spaces.id = paid_parking_allowed_availability.parking_space_id
#                     WHERE parking_spaces.owner = %(user_id)s
#                     AND   parking_spaces.id = %(spot_id)s
#
#                 """,
#                 {
#                     "spot_id": spot_id,
#                     "user_id": user_id,
#                 },
#             )
#             list_of_times = cur.fetchall()
#             return Ok(list_of_times)


# We have this take a cursor because we want this to only be called from the functions above
# Since it takes a cursor, it's gonna happen in the same transaction
# Unless if a transaction is explicitly started/ended
def recalculate_coalesce(cur: Cursor[DictRow | TupleRow], spot_id: uuid.UUID) -> None:
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
