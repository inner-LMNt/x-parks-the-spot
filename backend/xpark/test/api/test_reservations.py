from datetime import datetime, timedelta, timezone
from typing import Optional

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


def test_cancel_reservation(client: FlaskClient) -> None:
    """Test canceling a reservation"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    reservation_id = create_test_reservation_at_time(
        client, token, space_id
    )

    response = client.delete(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200