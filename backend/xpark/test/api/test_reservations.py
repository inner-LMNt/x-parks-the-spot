from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from flask.testing import FlaskClient

from xpark.test.utils.utils import create_test_user, create_test_parking_space, create_test_car


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
        car_id = create_test_car(client, token)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": space_id,
            "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "car_info_id": car_id
        }
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def test_create_reservation_basic(client: FlaskClient) -> None:
    """Test basic reservation creation"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    car_id = create_test_car(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=1)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": space_id,
            "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "car_info_id": car_id
        }
    )
    assert response.status_code == 201
    data = response.get_json()
    assert "id" in data


def test_create_reservation_overlapping_times(client: FlaskClient) -> None:
    """Test creating reservations with overlapping times"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    car_id = create_test_car(client, token)

    # Create initial reservation
    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=2)

    create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time,
        end_time=end_time,
        car_id=car_id
    )

    # Try to create overlapping reservation with the same car
    overlap_start = start_time + timedelta(minutes=30)
    overlap_end = end_time + timedelta(minutes=30)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": space_id,
            "start_time": overlap_start.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "end_time": overlap_end.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "car_info_id": car_id
        }
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "not available" in data["err"].lower()

def test_update_reservation_extend(client: FlaskClient) -> None:
    """Test extending a reservation's end time"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=1)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time,
        end_time=end_time
    )

    # For extend endpoint, use the special format
    new_end_time = end_time + timedelta(hours=1)
    new_end_str = new_end_time.strftime("%Y-%m-%dT%H:%M:00.000Z")

    response = client.put(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "end_time": new_end_str
        }
    )
    assert response.status_code == 200


def test_get_max_extension_time(client: FlaskClient) -> None:
    """Test getting maximum extension time for a reservation"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    car_id = create_test_car(client, token)

    # Create initial reservation
    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=1)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time,
        end_time=end_time,
        car_id=car_id
    )

    response = client.get(
        f"/api/unstable/reservations/{reservation_id}/max-extension",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "maxExtensionTime" in data
    

def test_create_reservation_invalid_times(client: FlaskClient) -> None:
    """Test creating a reservation with invalid time range"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    car_id = create_test_car(client, token)

    # Test end time before start time
    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time - timedelta(minutes=30)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": space_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "car_info_id": car_id
        }
    )
    assert response.status_code == 400
    assert "must be after" in response.get_json()["err"].lower()


def test_create_reservation_nonexistent_space(client: FlaskClient) -> None:
    """Test creating a reservation for a non-existent parking space"""
    token = create_test_user(client)
    car_id = create_test_car(client, token)
    fake_space_id = str(uuid.uuid4())

    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=1)

    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "parking_space_id": fake_space_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "car_info_id": car_id
        }
    )
    assert response.status_code == 400
    assert "not available" in response.get_json()["err"].lower()


def test_update_reservation_nonexistent(client: FlaskClient) -> None:
    """Test updating a non-existent reservation"""
    token = create_test_user(client)
    fake_reservation_id = str(uuid.uuid4())

    test_time = datetime.now(timezone.utc)
    formatted_time = test_time.strftime("%Y-%m-%dT%H:%M:00.000Z")

    response = client.put(
        f"/api/unstable/reservations/{fake_reservation_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "end_time": formatted_time
        }
    )
    assert response.status_code == 404
    assert "not found" in response.get_json()["err"].lower()


def test_update_reservation_overlap(client: FlaskClient) -> None:
    """Test updating a reservation to overlap with another"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    # Create first reservation with unique car
    start_time1 = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time1 = start_time1 + timedelta(hours=1)
    car_id1 = create_test_car(client, token, f"TEST-A-{uuid.uuid4().hex[:8]}")
    reservation_id1 = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time1,
        end_time=end_time1,
        car_id=car_id1
    )

    # Create second reservation with different car
    start_time2 = end_time1 + timedelta(hours=1)
    end_time2 = start_time2 + timedelta(hours=1)
    car_id2 = create_test_car(client, token, f"TEST-B-{uuid.uuid4().hex[:8]}")
    reservation_id2 = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time2,
        end_time=end_time2,
        car_id=car_id2
    )

    # Try to extend first reservation to overlap with second
    new_end_time = start_time2 + timedelta(minutes=30)
    formatted_time = new_end_time.strftime("%Y-%m-%dT%H:%M:00.000Z")

    response = client.put(
        f"/api/unstable/reservations/{reservation_id1}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "end_time": formatted_time
        }
    )
    assert response.status_code == 400
    assert "cannot extend" in response.get_json()["err"].lower()

    # Try to extend second reservation that has no overlap
    new_end_time = end_time2 + timedelta(minutes=30)
    formatted_time = new_end_time.strftime("%Y-%m-%dT%H:%M:00.000Z")

    response = client.put(
        f"/api/unstable/reservations/{reservation_id2}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "end_time": formatted_time
        }
    )
    assert response.status_code == 200

def test_cancel_nonexistent_reservation(client: FlaskClient) -> None:
    """Test canceling a non-existent reservation"""
    token = create_test_user(client)
    fake_reservation_id = str(uuid.uuid4())

    response = client.delete(
        f"/api/unstable/reservations/{fake_reservation_id}",
        headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404
    assert "not found" in response.get_json()["err"].lower()


def test_cancel_already_canceled_reservation(client: FlaskClient) -> None:
    """Test canceling an already canceled reservation"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=3)
    end_time = start_time + timedelta(hours=1)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time,
        end_time=end_time
    )

    response = client.delete(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.get_json()["message"] == "Reservation canceled successfully."

    # Try to cancel again
    response2 = client.delete(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {token}"})
    assert response2.status_code == 404


def test_get_max_extension_no_availability(client: FlaskClient) -> None:
    """Test getting max extension time when no extension is possible"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    # Create first reservation with unique car
    start_time1 = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time1 = start_time1 + timedelta(hours=1)
    car_id1 = create_test_car(client, token, f"TEST-X-{uuid.uuid4().hex[:8]}")
    reservation_id1 = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time1,
        end_time=end_time1,
        car_id=car_id1
    )

    # Create second reservation with different car starting 2 seconds after first ends
    car_id2 = create_test_car(client, token, f"TEST-Y-{uuid.uuid4().hex[:8]}")
    create_test_reservation_at_time(
        client, token, space_id,
        start_time=end_time1 + timedelta(seconds=2),
        end_time=end_time1 + timedelta(hours=1),
        car_id=car_id2
    )

    # Try to get max extension time for first reservation
    response = client.get(
        f"/api/unstable/reservations/{reservation_id1}/max-extension",
        headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 400
    assert "no available time" in response.get_json()["err"].lower()

def test_unauthorized_access(client: FlaskClient) -> None:
    """Test accessing reservations with wrong user"""
    token1 = create_test_user(client, "user1@example.com")
    token2 = create_test_user(client, "user2@example.com")
    space_id = create_test_parking_space(client, token1)

    # Create reservation with first user
    reservation_id = create_test_reservation_at_time(client, token1, space_id)

    # Try to access with second user
    routes = [
        f"/api/unstable/reservations/{reservation_id}",
        f"/api/unstable/reservations/{reservation_id}/max-extension"
    ]

    for route in routes:
        response = client.get(
            route,
            headers={"Authorization": f"Bearer {token2}"})
        assert response.status_code in [403, 404]
        assert any(msg in response.get_json()["err"].lower()
                   for msg in ["not found", "not authorized"])
        

def test_cancel_reservation_more_than_2_hours_before(client: FlaskClient) -> None:
    """Test canceling a reservation more than 2 hours before the start time"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=3)
    end_time = start_time + timedelta(hours=1)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time,
        end_time=end_time
    )

    response = client.delete(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.get_json()["message"] == "Reservation canceled successfully."


def test_cancel_reservation_less_than_2_hours_before(client: FlaskClient) -> None:
    """Test canceling a reservation less than 2 hours before the start time"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=1)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id,
        start_time=start_time,
        end_time=end_time
    )

    response = client.delete(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Reservations can only be canceled at least 2 hours before the start time." in response.get_json()["err"]