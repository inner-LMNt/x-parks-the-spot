import uuid

from flask.testing import FlaskClient
from typing import Dict, Any, List, Union, Optional, Tuple
from datetime import datetime, timedelta, timezone
import json
import io
from werkzeug.datastructures import FileStorage

from xpark.utils.db import DB


def create_points_transaction(
    client: FlaskClient, token: str, transaction_type: str, parking_space_id: uuid.UUID
) -> Any:
    """Create a test points transaction."""
    response = client.post(
        "/api/unstable/points",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "transaction_type": transaction_type,
            "parking_space_id": str(parking_space_id),
            "points": 10,
        },
    )
    assert response.status_code == 201, f"Expected 201 but got {response.status_code}"
    return response.get_json()


def create_test_user(client: FlaskClient, email: str = "test@example.com") -> str:
    """Helper to create a test user and return access token"""
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": email,
            "full_name": "Test User",
            "password": "TestPass123!",
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    access_token = data.get("access_token")
    assert access_token is not None, "Access token not found in response"
    return str(access_token)


def create_test_parking_space(
    client: FlaskClient,
    token: str,
    is_paid: bool = True,
    price: float = 10.0,
    name: str = "Test Space",
) -> str:
    """Helper to create a test parking space and return its ID"""
    # Create the parking space data

    parking_space_data: Dict[str, Any] = {
        "name": name if is_paid else None,
        "is_paid": is_paid,
        "location": {
            "longitude": -74.0060,
            "latitude": 40.7128,
            "address": "123 Test St",
        },
    }

    if is_paid:
        # Daily availability slots
        slots: List[Dict[str, str]] = []
        for day in [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]:
            slots.append(
                {"day_of_week": day, "start_time": "00:00", "end_time": "23:59"}
            )

        # Update with proper type annotations
        parking_space_data["pricing_info"] = {"base_price": price}
        parking_space_data["availability_schedule"] = slots

    # Prepare the multipart form data with proper types
    form_data: Dict[str, Union[str, FileStorage]] = {
        "data": json.dumps(parking_space_data),
        "image": FileStorage(
            stream=io.BytesIO(b"dummy image content"),
            filename="test.jpg",
            content_type="image/jpeg",
        ),
    }

    response = client.post(
        "/api/unstable/parking-spaces",
        headers={"Authorization": f"Bearer {token}"},
        data=form_data,
        content_type="multipart/form-data",
    )

    if response.status_code != 201:
        print(f"Parking space creation failed with status {response.status_code}")
        print(f"Response: {response.get_json()}")
        print(f"Request data: {parking_space_data}")

    assert (
        response.status_code == 201
    ), f"Failed to create parking space: {response.get_json()}"
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def create_test_car(
    client: FlaskClient, token: str, license_plate: Optional[str] = None
) -> str:
    """Helper to create a test car and return its ID"""
    if license_plate is None:
        # Generate a unique license plate
        license_plate = f"TEST-{uuid.uuid4().hex[:8]}"

    response = client.post(
        "/api/unstable/cars",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "make": "Toyota",
            "model": "Camry",
            "license_plate": license_plate,
            "license_plate_state": "CA",
        },
    )
    if response.status_code != 201:
        print(f"Car creation failed with status {response.status_code}")
        print(f"Response: {response.get_json()}")

    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def create_test_reservation_at_time(
    client: FlaskClient,
    token: str,
    space_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    car_id: Optional[str] = None,
) -> str:
    """Helper to create a test reservation with specific times"""
    if start_time is None:
        start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    if end_time is None:
        end_time = start_time + timedelta(hours=1)
    if car_id is None:
        # Create car with unique license plate
        car_id = create_test_car(client, token)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": space_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "car_info_id": car_id,
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def create_test_reservation(client: FlaskClient, token: str, space_id: str) -> str:
    """Helper to create a test reservation and return its ID"""
    # First create a car for the reservation
    car_id = create_test_car(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=10)
    end_time = start_time + timedelta(hours=1)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": space_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "car_info_id": car_id,
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def create_sequential_reservations(
    client: FlaskClient,
    token: str,
    space_id: str,
    num_reservations: int,
    hours_between: int = 1,
) -> list[str]:
    """Create multiple sequential reservations with gaps between them"""
    reservation_ids = []
    start_time = datetime.now(timezone.utc) + timedelta(hours=1)

    for i in range(num_reservations):
        end_time = start_time + timedelta(hours=1)
        reservation_id = create_test_reservation_at_time(
            client, token, space_id, start_time=start_time, end_time=end_time
        )
        reservation_ids.append(reservation_id)
        start_time = end_time + timedelta(hours=hours_between)

    return reservation_ids


def submit_parking_verification(client: FlaskClient, token: str, space_id: str) -> None:
    """Helper to submit a verification request for a parking space with an image."""
    # Create a dummy image file for verification
    image_data = io.BytesIO(b"dummy image content")
    image_file = FileStorage(
        stream=image_data, filename="verification.jpg", content_type="image/jpeg"
    )

    response = client.post(
        f"/api/unstable/parking-spaces/{space_id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        data={"image": image_file},
        content_type="multipart/form-data",
    )

    assert (
        response.status_code == 200
    ), f"Verification submission failed: {response.get_json()}"
    data = response.get_json()
    assert data is not None
    print("Verification submitted successfully")


def create_test_conflict(
    client: FlaskClient,
    token: str,
    reservation_id: str,
    description: str = "Test conflict",
    conflict_type: str = "Other",
    damage_type: Optional[str] = None,
    damage_severity: Optional[str] = None,
    departure_time: Optional[datetime] = None,
    image: Optional[FileStorage] = None,
) -> str:
    """
    Create a test conflict (report) using the provided parameters.
    Returns the conflict ID.
    """
    # Determine the endpoint based on conflict type
    if conflict_type == "Other":
        url = "/api/unstable/reports/other-issue"
        data = {"description": description}
    elif conflict_type == "Reservation Issue":
        url = "/api/unstable/reports/reservation-issue"
        data = {"description": description, "reservation_id": reservation_id}
    elif conflict_type == "Damage Report":
        url = "/api/unstable/reports/damage-report"
        data = {
            "description": description,
            "owner_reservation_id": reservation_id,
            "damage_type": damage_type or "scratch",
            "damage_severity": damage_severity or "Minor",
        }
        if not image:
            image = create_test_image()
    elif conflict_type == "Renter Overstay":
        url = "/api/unstable/reports/renter-overstay"
        data = {
            "description": description,
            "owner_reservation_id": reservation_id,
            "departure_time": (
                departure_time or datetime.now(timezone.utc)
            ).isoformat(),
        }
        if not image:
            image = create_test_image()
    else:
        raise ValueError(f"Unsupported conflict type: {conflict_type}")

    # Add image if provided
    if image:
        files = {"image": image}
        response = client.post(
            url,
            data={**data, **files},
            headers={"Authorization": f"Bearer {token}"},
            content_type="multipart/form-data",
        )
    else:
        response = client.post(
            url,
            data=data,
            headers={"Authorization": f"Bearer {token}"},
            content_type="application/x-www-form-urlencoded",
        )

    assert (
        response.status_code == 201
    ), f"Expected 201, got {response.status_code} with response {response.data}"
    data = response.get_json()
    assert data is not None, "Expected non-empty response data"
    assert "id" in data, "Response missing 'id' key"

    return str(data["id"])


def update_conflict_response(
    client: FlaskClient, token: str, conflict_id: str, admin_response: str
) -> str | Any:
    """
    Update the response for an existing conflict using the PUT endpoint.
    Returns the updated report data.
    """
    response = client.put(
        f"/api/unstable/reports/{conflict_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"admin_response": admin_response},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.get_json()
    assert data is not None, "Expected non-empty response data"
    return data


def create_test_report(
    client: FlaskClient,
    token: str,
    report_type: str,
    reservation_id: Optional[str] = None,
    description: str = "This is a detailed test report description",
    departure_time: Optional[datetime] = None,
    damage_type: Optional[str] = None,
    damage_severity: Optional[str] = None,
    image: Optional[FileStorage] = None,
) -> Dict[str, Any]:
    """Create a test report based on type with proper form data"""

    if len(description) < 10:
        raise ValueError("Description must be at least 10 characters long")

    data = {"description": description}

    if report_type == "Other":
        url = "/api/unstable/reports/other-issue"
    elif report_type == "Reservation Issue":
        url = "/api/unstable/reports/reservation-issue"
        data["reservation_id"] = reservation_id  # type: ignore
    elif report_type == "Renter Overstay":
        url = "/api/unstable/reports/renter-overstay"
        data["owner_reservation_id"] = reservation_id  # type: ignore
        data["departure_time"] = (
            departure_time or datetime.now(timezone.utc)
        ).isoformat()
        if not image:
            image = create_test_image()
    elif report_type == "Damage Report":
        url = "/api/unstable/reports/damage-report"
        data["owner_reservation_id"] = reservation_id  # type: ignore
        data["damage_type"] = damage_type or "scratch"
        data["damage_severity"] = damage_severity or "Minor"
        if not image:
            image = create_test_image()
    else:
        raise Exception("Invalid report type")

    if image:
        files = {"image": image}
        response = client.post(
            url,
            data={**data, **files},
            headers={"Authorization": f"Bearer {token}"},
            content_type="multipart/form-data",
        )
    else:
        response = client.post(
            url,
            data=data,
            headers={"Authorization": f"Bearer {token}"},
            content_type="application/x-www-form-urlencoded",
        )

    assert (
        response.status_code == 201
    ), f"Failed to create report: {response.get_json()}"
    return response.get_json()  # type: ignore


def create_test_image(
    filename: str = "test.jpg", content_type: str = "image/jpeg"
) -> FileStorage:
    """Create a test image file"""
    return FileStorage(
        stream=io.BytesIO(b"dummy image content"),
        filename=filename,
        content_type=content_type,
    )


def setup_analytics_scenario(
    client: FlaskClient,
    num_spots: int = 3,
    reservations_per_spot: int = 5,
    days_of_history: int = 30,
) -> Tuple[str, str, Dict[str, List[str] | Dict[str, List[str]]]]:
    """
    Creates a complete analytics testing scenario with:
    - One owner with multiple spots
    - One renter making multiple reservations
    - Varied reservation patterns over time
    """
    # Create owner and renter
    owner_token = create_test_user(client, "owner@example.com")
    renter_token = create_test_user(client, "renter@example.com")
    renter_id = get_user_id_from_token(client, renter_token)

    car_id = create_test_car(client, renter_token)

    spot_ids = []
    reservation_ids: Dict[str, List[str]] = {}
    base_time = (
        datetime.now(timezone.utc)
        - timedelta(days=days_of_history)
        + timedelta(minutes=2)
    )

    # Create spots with different prices
    for i in range(num_spots):
        spot_id = create_test_parking_space(
            client,
            owner_token,
            price=10.0 * (i + 1),  # Different prices for different spots
            name=f"Test Spot {i + 1}",
        )
        spot_ids.append(spot_id)
        reservation_ids[spot_id] = []

        # Create reservations with varied patterns
        for j in range(reservations_per_spot):
            # Vary reservation times and durations
            start_time = base_time + timedelta(
                days=j * (days_of_history // reservations_per_spot),
                hours=i * 2,  # Stagger reservations across spots
            )
            duration = timedelta(hours=2 + (j % 3))  # Vary duration between 2-4 hours
            end_time = start_time + duration

            # Insert directly to bypass API validation for past dates
            insert_reservation_directly(
                renter_id=renter_id,
                space_id=spot_id,
                car_id=car_id,
                start_time=start_time,
                end_time=end_time,
            )
            # Store the reservation ID (though we don't get it back from insert_directly)
            reservation_ids[spot_id].append(str(uuid.uuid4()))

    return (
        owner_token,
        renter_token,
        {"spot_ids": spot_ids, "reservation_ids": reservation_ids},
    )


def generate_varied_reservation_pattern(
    client: FlaskClient,
    token: str,
    spot_id: str,
    pattern_type: str,
    base_time: datetime,
    num_reservations: int,
) -> List[str]:
    """
    Generate reservations following specific patterns:
    - "peak_hours": Concentrated during business hours
    - "weekend_heavy": More reservations on weekends
    - "random": Randomly distributed
    """
    reservation_ids = []
    car_id = create_test_car(client, token)
    renter_id = get_user_id_from_token(client, token)

    if pattern_type == "peak_hours":
        for i in range(num_reservations):
            day_offset = i // 3  # 3 reservations per day
            hour = 9 + (i % 8)  # Reservations between 9 AM and 5 PM
            start_time = base_time + timedelta(days=day_offset, hours=hour)
            end_time = start_time + timedelta(hours=2)

            insert_reservation_directly(
                renter_id=renter_id,
                space_id=spot_id,
                car_id=car_id,
                start_time=start_time,
                end_time=end_time,
            )
            reservation_ids.append(str(uuid.uuid4()))

    elif pattern_type == "weekend_heavy":
        current_time = base_time
        while len(reservation_ids) < num_reservations:
            if current_time.weekday() >= 5:  # Weekend
                for hour in [10, 14, 18]:  # Multiple reservations on weekends
                    if len(reservation_ids) < num_reservations:
                        start_time = current_time.replace(hour=hour)
                        end_time = start_time + timedelta(hours=3)

                        insert_reservation_directly(
                            renter_id=renter_id,
                            space_id=spot_id,
                            car_id=car_id,
                            start_time=start_time,
                            end_time=end_time,
                        )
                        reservation_ids.append(str(uuid.uuid4()))
            else:  # Weekday
                if len(reservation_ids) < num_reservations:
                    start_time = current_time.replace(hour=14)
                    end_time = start_time + timedelta(hours=2)

                    insert_reservation_directly(
                        renter_id=renter_id,
                        space_id=spot_id,
                        car_id=car_id,
                        start_time=start_time,
                        end_time=end_time,
                    )
                    reservation_ids.append(str(uuid.uuid4()))
            current_time += timedelta(days=1)

    return reservation_ids


def submit_test_ratings(
    client: FlaskClient, token: str, spot_id: str, num_ratings: int = 3
) -> None:
    """Submit multiple test ratings for a spot"""
    ratings = [
        (5, 4),
        (4, 5),
        (3, 4),
        (4, 3),
        (5, 5),  # Availability, Cleanliness pairs
    ]

    for i in range(min(num_ratings, len(ratings))):
        response = client.post(
            f"/api/unstable/parking-spaces/{spot_id}/rate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "availability_rating": ratings[i][0],
                "cleanliness_rating": ratings[i][1],
            },
        )
        assert response.status_code == 200


def insert_reservation_directly(
    renter_id: str, space_id: str, car_id: str, start_time: datetime, end_time: datetime
) -> None:
    """Inserts a reservation directly into the database for testing purposes."""
    reservation_id = str(uuid.uuid4())
    duration_hours = (end_time - start_time).total_seconds() / 3600

    # Retrieve the price of the parking space
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT price FROM parking_spaces WHERE id = %s", (space_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError(f"Parking space with id {space_id} not found.")
            space_price_per_hour = result[0]

    # Calculate the total price
    total_price = duration_hours * space_price_per_hour

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reservations (
                    id,
                    parking_space_id,
                    renter_id,
                    car_info_id,
                    time,
                    status,
                    price
                ) VALUES (%s, %s, %s, %s, tstzrange(%s, %s), %s, %s)
            """,
                (
                    reservation_id,
                    space_id,
                    renter_id,
                    car_id,
                    start_time,
                    end_time,
                    "completed",  # Assuming past reservations are completed
                    total_price,
                ),
            )


def get_user_id_from_token(client: FlaskClient, token: str) -> str:
    """Retrieves the user ID associated with the given token."""
    response = client.get(
        "/api/unstable/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Failed to get user ID: {response.get_json()}"
    data = response.get_json()
    user_id = data.get("id")
    assert user_id is not None, "User ID not found in response"
    assert type(user_id) is str
    return user_id


def mark_reservations_completed(reservation_ids: List[str]) -> None:
    """Marks the specified reservations as completed in the database."""
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE reservations SET status = 'completed' WHERE id = ANY(%s)",
                (reservation_ids,),
            )
