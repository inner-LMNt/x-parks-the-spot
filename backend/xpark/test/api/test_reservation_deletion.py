# test_reservation_deletion.py

import uuid
from flask.testing import FlaskClient
from datetime import datetime, timedelta, timezone
from xpark.logic.reservations import create_reservation, cancel_reservation_logic
from result import Ok, Err

def register_user(client: FlaskClient, email: str, password: str) -> str:
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": email,
            "full_name": "Test User",
            "password": password,
        },
    )
    assert response.status_code == 201
    return response.json["access_token"]

def create_test_reservation(client: FlaskClient, token: str, start_time: datetime, end_time: datetime) -> uuid.UUID:
    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": "Bearer " + token},
        json={
            "parking_space_id": str(uuid.uuid4()),
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "car_info_id": str(uuid.uuid4()),
            "renter_id": str(uuid.uuid4()),
        },
    )
    assert response.status_code == 201
    return uuid.UUID(response.json["id"])

def test_cancel_reservation_success(client: FlaskClient) -> None:
    token = register_user(client, "testuser@example.com", "TestPassword123")
    start_time = datetime.now(timezone.utc) + timedelta(days=1)
    end_time = start_time + timedelta(hours=2)
    reservation_id = create_test_reservation(client, token, start_time, end_time)

    result = cancel_reservation_logic(uuid.UUID(token), reservation_id)
    assert isinstance(result, Ok)

def test_cancel_reservation_too_late(client: FlaskClient) -> None:
    token = register_user(client, "testuser2@example.com", "TestPassword123")
    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=2)
    reservation_id = create_test_reservation(client, token, start_time, end_time)

    result = cancel_reservation_logic(uuid.UUID(token), reservation_id)
    assert isinstance(result, Err)
    assert result.err() == "Reservations can only be canceled at least 2 hours before the start time."

def test_cancel_reservation_not_owner(client: FlaskClient) -> None:
    token1 = register_user(client, "testuser3@example.com", "TestPassword123")
    token2 = register_user(client, "testuser4@example.com", "TestPassword123")
    start_time = datetime.now(timezone.utc) + timedelta(days=1)
    end_time = start_time + timedelta(hours=2)
    reservation_id = create_test_reservation(client, token1, start_time, end_time)

    result = cancel_reservation_logic(uuid.UUID(token2), reservation_id)
    assert isinstance(result, Err)
    assert result.err() == "User not authorized to cancel this reservation."