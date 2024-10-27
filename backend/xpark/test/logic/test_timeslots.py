# Testing for the timeslots/coalescing

from xpark.logic.timeslots import (
    add_paid_parking_space_time,
)
from xpark.logic.parkingspace import (
    create_paid_parking_space,
)
from xpark.logic.user import create_user

from datetime import datetime
import zoneinfo

from result import Ok

from xpark.utils.db import DB
from psycopg.types.range import Range

# Wait why am I not doing this from the API
# I'll make the API later, right now I gotta test this stuff so I can go to bed


def test_coalesce() -> None:
    # First create a user who will own the parking spaces
    user_id_create = create_user(
        name="Test User", email="testuser@example.com", password="secureP@ssW0rD!"
    )

    assert type(user_id_create) is Ok

    # Then create a parking space for the coalescing to work on
    parking_space_id = create_paid_parking_space(
        user_id_create.ok_value, None, 0.0, 0.0, "address"
    )
    assert type(parking_space_id) is Ok

    # Then create timeslots for that parking spot
    start_time = datetime(2024, 10, 26, 6, 0, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    end_time = datetime(2024, 10, 26, 7, 0, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    t0 = add_paid_parking_space_time(
        user_id_create.ok_value, parking_space_id.ok_value["id"], start_time, end_time
    )

    assert type(t0) is Ok

    start_time = datetime(2024, 10, 26, 7, 0, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    end_time = datetime(2024, 10, 26, 8, 0, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    t1 = add_paid_parking_space_time(
        user_id_create.ok_value, parking_space_id.ok_value["id"], start_time, end_time
    )

    assert type(t1) is Ok

    start_time = datetime(2024, 10, 26, 10, 1, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    end_time = datetime(2024, 10, 26, 11, 0, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    t2 = add_paid_parking_space_time(
        user_id_create.ok_value, parking_space_id.ok_value["id"], start_time, end_time
    )

    assert type(t2) is Ok

    start_time = datetime(2024, 10, 26, 7, 55, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    end_time = datetime(2024, 10, 26, 9, 0, 0, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"))
    t3 = add_paid_parking_space_time(
        user_id_create.ok_value, parking_space_id.ok_value["id"], start_time, end_time
    )

    assert type(t3) is Ok

    # We now have two timeslots, one from 6-7, and one from 7-8.
    # These should be coalesced.
    with DB.pool.connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * from timetable_coalesce")
        tt = cur.fetchone()
        assert tt is not None

        # Check the values of tt
        assert tt[1:] == (
            parking_space_id.ok_value["id"],
            Range(
                datetime(2024, 10, 26, 6, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC")),
                datetime(2024, 10, 26, 9, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC")),
                "[]",  # inclusive bounds
            ),
        )

        tt = cur.fetchone()
        assert tt is not None

        # Check the values of tt
        assert tt[1:] == (
            parking_space_id.ok_value["id"],
            Range(
                datetime(2024, 10, 26, 10, 1, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC")),
                datetime(2024, 10, 26, 11, 0, tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC")),
                "[]",  # inclusive bounds
            ),
        )
