# Testing for the timeslots/coalescing
import pytest

from xpark.logic.parkingspace import (
    create_paid_parking_space,
)
from xpark.logic.user import create_user

from datetime import datetime, timedelta
import zoneinfo

from result import Ok

from xpark.utils.db import DB
from psycopg.types.range import Range

# Wait why am I not doing this from the API
# I'll make the API later, right now I gotta test this stuff so I can go to bed


@pytest.mark.skip(reason="")
def test_coalesce() -> None:
    # First create a user who will own the parking spaces
    user_id_create = create_user(
        name="Test User", email="testuser@example.com", password="secureP@ssW0rD!"
    )

    assert type(user_id_create) is Ok

    # Then create a parking space for the coalescing to work on
    parking_space_id = create_paid_parking_space(
        user_id_create.ok_value,
        None,
        0.0,
        0.0,
        "address",
        name="name",
        price=10.00,
        availability_schedule=[
            {"day_of_week": "Monday", "start_time": "00:00", "end_time": "23:59"},
            {"day_of_week": "Tuesday", "start_time": "00:00", "end_time": "23:59"},
            {"day_of_week": "Wednesday", "start_time": "00:00", "end_time": "23:59"},
            {"day_of_week": "Thursday", "start_time": "00:00", "end_time": "23:59"},
            {"day_of_week": "Friday", "start_time": "00:00", "end_time": "23:59"},
            {"day_of_week": "Saturday", "start_time": "00:00", "end_time": "23:59"},
            {"day_of_week": "Sunday", "start_time": "00:00", "end_time": "23:59"},
        ],
    )
    assert type(parking_space_id) is Ok

    # We now have a bunch of timeslots
    # These should be coalesced.
    with DB.pool.connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * from timetable_coalesce")
        tt = cur.fetchone()
        assert tt is not None

        today = datetime.now(tz=zoneinfo.ZoneInfo("America/New_York"))
        end = datetime.now(tz=zoneinfo.ZoneInfo("America/New_York")) + timedelta(
            days=364
        )  # 7 days times 52 weeks = 364 days

        # Check the values of tt

        assert tt[1:] == (
            parking_space_id.ok_value["id"],
            Range(
                datetime(
                    today.year,
                    today.month,
                    today.day,
                    3,
                    59,
                    tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"),
                ),
                datetime(
                    end.year,
                    end.month,
                    end.day,
                    4,
                    0,
                    tzinfo=zoneinfo.ZoneInfo(key="Etc/UTC"),
                ),
                "[]",  # inclusive bounds
            ),
        )
