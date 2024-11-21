import uuid
from typing import Optional, Dict, Any, List
from zoneinfo import ZoneInfo
from psycopg.rows import dict_row
from xpark.utils.db import DB
from result import Result, Ok, Err
import datetime
from enum import Enum
import psycopg
from psycopg import Cursor
from psycopg.rows import DictRow

from xpark.utils.mailer import send_email, generate_templated_email


class ReservationStatus(Enum):
    book = "booked"
    cancel = "canceled"
    complete = "completed"


def check_if_available(
    conn: psycopg.Connection,
    parking_spot_id: uuid.UUID,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
) -> bool:
    with conn.cursor(row_factory=dict_row) as cur:
        # Check if the spot has a proper timeslot
        cur.execute(
            """
            SELECT count(id) FROM
            timetable_coalesce
            WHERE parking_space_id = %(spot_id)s
            AND TSTZRANGE(%(start_time)s, %(end_time)s, '[]') <@ time
            """,
            {
                "spot_id": parking_spot_id,
                "end_time": end_time,
                "start_time": start_time,
            },
        )
        count = cur.fetchone()["count"]  # type: ignore
        if int(count) == 0:
            return False

        # Now check if a reservation overlaps
        cur.execute(
            """
            SELECT count(id) FROM
            reservations
            WHERE parking_space_id = %(spot_id)s
            AND   TSTZRANGE(%(start_time)s, %(end_time)s, '[]') && time
            """,
            {
                "spot_id": parking_spot_id,
                "end_time": end_time,
                "start_time": start_time,
            },
        )
        count = cur.fetchone()["count"]  # type: ignore
        if int(count) > 0:
            return False

        return True


def get_user_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    reservations.id, 
                    parking_spaces.name,
                    parking_space_id, 
                    lower(time) as start_time,
                    upper(time) as end_time,
                    car_info_id, 
                    renter_id,
                    status,
                    json_build_object(
                        'address',   parking_spaces.address,
                        'latitude',  ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ) as location,
                    reservations.price,
                    reservations.created_at,
                    reservations.updated_at
                FROM reservations JOIN parking_spaces ON 
                    reservations.parking_space_id = parking_spaces.id
                WHERE renter_id = %s
            """,
                (user_id,),
            )
            return Ok(cur.fetchall())


def calculate_booking_price(
    cur: Cursor[DictRow],
    parking_space_id: uuid.UUID,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
) -> float:
    cur.execute("SELECT price FROM parking_spaces WHERE id = %s", (parking_space_id,))
    res = cur.fetchone()
    assert res
    price = res["price"]
    assert type(price) is float
    delta = end_time - start_time
    hours = delta.days * 24 + delta.seconds / 3600
    return hours * price


def create_reservation(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    car_info_id: uuid.UUID,
) -> Result[Dict[str, Any], str]:
    if end_time <= start_time:
        return Err("End time must be after start time.")

    # Book the spot since it is available

    # Check if parking space exists and is available
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # We're gonna do this all in one txn so that's why we passed conn
            if not check_if_available(conn, parking_space_id, start_time, end_time):
                return Err("Spot not available")
            # Insert the reservation
            cur.execute(
                """
                INSERT INTO reservations (
                    parking_space_id,
                    time,
                    car_info_id,
                    renter_id,
                    status,
                    price,
                    created_at,
                    updated_at
                ) VALUES (
                    %(id)s,
                    TSTZRANGE(%(start_time)s, %(end_time)s, '[]'),
                    %(car_id)s,
                    %(user_id)s,
                    'booked',
                    %(price)s,
                    NOW(),
                    NOW()
                )
                RETURNING id, parking_space_id, lower(time) as start_time, upper(time) as end_time, car_info_id, status, created_at, updated_at
                """,
                {
                    "id": parking_space_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "car_id": car_info_id,
                    "user_id": user_id,
                    "price": calculate_booking_price(
                        cur, parking_space_id, start_time, end_time
                    ),
                },
            )

            reservation = cur.fetchone()
            if not reservation:
                return Err("Unable to create reservation")

            return Ok(reservation)


def get_reservation(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    reservations.id, 
                    parking_spaces.name,
                    parking_space_id, 
                    lower(time) as start_time,
                    upper(time) as end_time,
                    car_info_id, 
                    renter_id,
                    status,
                    json_build_object(
                        'address',   parking_spaces.address,
                        'latitude',  ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ) as location,
                    reservations.price,
                    reservations.created_at,
                    reservations.updated_at
                FROM reservations JOIN parking_spaces ON 
                    reservations.parking_space_id = parking_spaces.id
                WHERE reservations.id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found.")

            return Ok(reservation)


def update_reservation(
    user_id: uuid.UUID,
    reservation_id: uuid.UUID,
    start_time: Optional[datetime.datetime] = None,
    end_time: Optional[datetime.datetime] = None,
    car_info_id: Optional[uuid.UUID] = None,
) -> Result[Dict[str, Any] | None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    parking_space_id,
                    lower(time) AS start_time,
                    upper(time) AS end_time,
                    car_info_id
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()
            if not reservation:
                return Err("Reservation not found")
            if start_time is not None:
                if not check_if_available(
                    conn=conn,
                    parking_spot_id=reservation["parking_space_id"],
                    start_time=start_time,
                    end_time=reservation["start_time"] - datetime.timedelta(seconds=1),
                ):
                    return Err("Cannot extend booking to this time")
            if end_time is not None:
                if not check_if_available(
                    conn=conn,
                    parking_spot_id=reservation["parking_space_id"],
                    start_time=reservation["end_time"] + datetime.timedelta(seconds=1),
                    end_time=end_time,
                ):
                    return Err("Cannot extend booking to this time")

            if not start_time:
                start_time = reservation["start_time"]
            if not end_time:
                end_time = reservation["end_time"]
        # Update reservation
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE reservations SET
                    time = tstzrange(%s, %s, '[]'),
                    price = COALESCE(price, %s),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, parking_space_id, lower(time) as start_time, upper(time) as end_time, car_info_id, renter_id, price, status, created_at, updated_at
                """,
                (
                    start_time,
                    end_time,
                    (
                        calculate_booking_price(
                            cur, reservation["parking_space_id"], start_time, end_time
                        )
                        if start_time and end_time
                        else None
                    ),
                    reservation_id,
                ),
            )
            updated_reservation = cur.fetchone()
        if not updated_reservation:
            return Err("Failed to update reservation")

        # Fetch the parking space owner's ID, address, and price from the parking_spaces table
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT owner, address, price
                FROM parking_spaces
                WHERE id = %s
                """,
                (updated_reservation["parking_space_id"],),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Parking space not found")
            owner_id = parking_space["owner"]
            parking_address = parking_space.get("address", "Unknown Location")
            parking_price = parking_space.get(
                "price", 0.0
            )  # Assuming price is a float representing price per hour

        # Fetch the owner's email and name from the users table
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT email, name
                FROM users
                WHERE id = %s
                """,
                (owner_id,),
            )
            owner = cur.fetchone()
            if not owner:
                return Err("Owner not found")
            owner_email = owner["email"]
            owner_name = owner.get("name", "Owner")

        # Fetch renter's information from the users table
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT name, email
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            renter = cur.fetchone()
            if not renter:
                renter_name = "A user"
            else:
                renter_name = renter.get("name", "A user")

        # Fetch car details from the cars table
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT license_plate, make, model
                FROM cars
                WHERE id = %s
                """,
                (updated_reservation["car_info_id"],),
            )
            car = cur.fetchone()
            if not car:
                car_info = "Unknown Car"
            else:
                car_info = f"{car['make']} {car['model']} (License Plate: {car['license_plate']})"

        # Calculate extension length and extra money earned
        extension_delta = updated_reservation["end_time"] - reservation["end_time"]
        if extension_delta.total_seconds() > 0:
            extension_hours = extension_delta.total_seconds() / 3600
            # Round to two decimal places for currency formatting
            extra_earned = round(extension_hours * parking_price, 2)
            # Format extension length into hours and minutes
            hours = int(extension_hours)
            minutes = int((extension_hours - hours) * 60)
            extension_length_str = f"{hours} hours and {minutes} minutes"
        else:
            extension_length_str = "No extension"
            extra_earned = 0.0

        # Convert start_time and end_time to EST
        est = ZoneInfo("America/New_York")
        start_time_est = (
            updated_reservation["start_time"]
            .replace(tzinfo=ZoneInfo("UTC"))
            .astimezone(est)
            .strftime("%B %d, %Y %I:%M %p EST")
        )
        end_time_est = (
            updated_reservation["end_time"]
            .replace(tzinfo=ZoneInfo("UTC"))
            .astimezone(est)
            .strftime("%B %d, %Y %I:%M %p EST")
        )

        # Prepare the email content
        email_subject = "XPark Booking Extension Notification"
        email_content = f"""Hello {owner_name},

        We would like to inform you that {renter_name} has extended their booking for your parking space located at {parking_address}.

        Updated Reservation Details:
        - Reservation ID: {updated_reservation['id']}
        - Start Time: {start_time_est}
        - End Time: {end_time_est}
        - Car: {car_info}
        - Extension Length: {extension_length_str}
        - Extra Earned: ${extra_earned}

        If you have any questions or concerns, please feel free to contact us.

        Best regards,
        XPark Team
        """

        # Send the email to the parking space owner
        send_email(
            subject=email_subject,
            to=owner_email,
            content=email_content,
        )

        return Ok(updated_reservation)


def cancel_reservation_logic(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Update the reservation if it exists and is valid
            cur.execute(
                """
                UPDATE reservations
                SET status = 'canceled', updated_at = NOW()
                WHERE id = %s AND renter_id = %s AND status = 'booked'
                RETURNING status, lower(time) as start_time
                """,
                (reservation_id, user_id),
            )

            ret = cur.fetchone()
            if not ret:
                return Err("Reservation not found")

            status, start_time = ret

            # Ensure start_time is timezone-aware
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=datetime.timezone.utc)

            # Get the current time in UTC
            current_time = datetime.datetime.now(datetime.timezone.utc)

            # Check if the current time is at least 2 hours before the reservation start time
            if start_time - current_time < datetime.timedelta(hours=2):
                return Err(
                    "Reservations can only be canceled at least 2 hours before the start time."
                )

            return Ok(None)


def get_max_extension_time_logic(
    user_id: uuid.UUID, reservation_id: uuid.UUID
) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Fetch reservation details
            cur.execute(
                """
                SELECT 
                    parking_space_id,
                    lower(time) AS start_time,
                    upper(time) AS end_time,
                    car_info_id
                FROM reservations
                WHERE id = %s AND renter_id = %s
                """,
                (reservation_id, user_id),
            )
            reservation = cur.fetchone()

            if not reservation:
                return Err("Reservation not found or not authorized")

            current_end_time = reservation["end_time"]
            if not current_end_time:
                return Err("Invalid reservation end time")

            # First check if there's at least 30 minutes available
            min_extension = current_end_time + datetime.timedelta(minutes=30)
            if not check_if_available(
                conn=conn,
                parking_spot_id=reservation["parking_space_id"],
                start_time=current_end_time + datetime.timedelta(seconds=1),
                end_time=min_extension,
            ):
                return Err("No available time for extension")

            # Search by hour first (up to a week)
            max_hours = 24 * 7
            available_hour = None

            for hour in range(1, max_hours + 1):
                test_end_time = current_end_time + datetime.timedelta(hours=hour)

                if not check_if_available(
                    conn=conn,
                    parking_spot_id=reservation["parking_space_id"],
                    start_time=current_end_time + datetime.timedelta(seconds=1),
                    end_time=test_end_time,
                ):
                    available_hour = hour - 1
                    break

            if available_hour is None:
                available_hour = max_hours

            # Binary search for exact minute within the last available hour
            start_minute = 0
            end_minute = 60
            last_valid_time = None

            while start_minute <= end_minute:
                mid_minute = (start_minute + end_minute) // 2
                test_end_time = current_end_time + datetime.timedelta(
                    hours=available_hour, minutes=mid_minute
                )

                if check_if_available(
                    conn=conn,
                    parking_spot_id=reservation["parking_space_id"],
                    start_time=current_end_time + datetime.timedelta(seconds=1),
                    end_time=test_end_time,
                ):
                    last_valid_time = test_end_time
                    start_minute = mid_minute + 1
                else:
                    end_minute = mid_minute - 1

            if not last_valid_time:
                last_valid_time = current_end_time + datetime.timedelta(
                    hours=available_hour
                )

            return Ok(last_valid_time.isoformat())


def get_owner_reservations(user_id: uuid.UUID) -> Result[List[Dict[str, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    reservations.id, 
                    parking_spaces.name,
                    parking_space_id, 
                    lower(time) as start_time,
                    upper(time) as end_time,
                    car_info_id, 
                    renter_id,
                    status,
                    json_build_object(
                        'address',   parking_spaces.address,
                        'latitude',  ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ) as location,
                    reservations.price,
                    reservations.created_at,
                    reservations.updated_at
                FROM reservations 
                JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                WHERE parking_spaces.owner = %s
                ORDER BY reservations.created_at DESC
            """,
                (user_id,),
            )
            return Ok(cur.fetchall())


def force_cancel_reservation_logic(user_id: uuid.UUID, reservation_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    parking_spaces.name AS parking_space_name,
                    LOWER(reservations.time) AS start_time,
                    UPPER(reservations.time) AS end_time,
                    users.email AS renter_email,
                    users.name AS renter_name
                FROM reservations
                JOIN parking_spaces ON reservations.parking_space_id = parking_spaces.id
                JOIN users ON reservations.renter_id = users.id
                WHERE reservations.id = %s
                """,
                (reservation_id,),
            )
            reservation = cur.fetchone()

            if not reservation:
                return Err("Reservation not found")

            cur.execute(
                """
                UPDATE reservations
                SET status = 'canceled'
                WHERE id = %s AND parking_space_id IN (
                    SELECT id FROM parking_spaces WHERE owner = %s
                )
                """,
                (reservation_id, user_id),
            )

            if cur.rowcount == 0:
                return Err("Force cancellation not authorized")

            # Send cancellation email to renter
            email_content = generate_templated_email(
                "reservation_force_canceled",
                name=reservation["renter_name"],
                parking_space_name=reservation["parking_space_name"],
                start_time=reservation["start_time"].strftime("%Y-%m-%d %H:%M %Z"),
                end_time=reservation["end_time"].strftime("%Y-%m-%d %H:%M %Z"),
            )
            send_email(
                to=reservation["renter_email"],
                subject="Your Parking Reservation Has Been Canceled",
                content=email_content,
            )

            return Ok(None)
