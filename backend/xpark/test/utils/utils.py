from flask.testing import FlaskClient
from typing import Dict, Any, List, Union
from datetime import datetime, timedelta, timezone
import json
import io
from werkzeug.datastructures import FileStorage


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


def create_test_parking_space(client: FlaskClient, token: str, is_paid: bool = True) -> str:
    """Helper to create a test parking space and return its ID"""
    # Create the parking space data

    parking_space_data: Dict[str, Any] = {
        "name": "Test Space" if is_paid else None,
        "is_paid": is_paid,
        "location": {
            "longitude": -74.0060,
            "latitude": 40.7128,
            "address": "123 Test St"
        },
    }

    if is_paid:
        # Daily availability slots
        slots: List[Dict[str, str]] = []
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
            slots.append({
                "day_of_week": day,
                "start_time": "00:00",
                "end_time": "23:59"
            })

        # Update with proper type annotations
        parking_space_data["pricing_info"] = {
            "base_price": 10.0
        }
        parking_space_data["availability_schedule"] = slots

    # Prepare the multipart form data with proper types
    form_data: Dict[str, Union[str, FileStorage]] = {
        'data': json.dumps(parking_space_data),
        'image': FileStorage(
            stream=io.BytesIO(b"dummy image content"),
            filename="test.jpg",
            content_type="image/jpeg"
        )
    }

    response = client.post(
        "/api/unstable/parking-spaces",
        headers={"Authorization": f"Bearer {token}"},
        data=form_data,
        content_type='multipart/form-data'
    )

    if response.status_code != 201:
        print(f"Parking space creation failed with status {response.status_code}")
        print(f"Response: {response.get_json()}")
        print(f"Request data: {parking_space_data}")

    assert response.status_code == 201, f"Failed to create parking space: {response.get_json()}"
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def create_test_car(client: FlaskClient, token: str) -> str:
    """Helper to create a test car and return its ID"""
    response = client.post(
        "/api/unstable/cars",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "make": "Toyota",
            "model": "Camry",
            "year": 2020,
            "color": "Blue",
            "license_plate": "TEST123"
        }
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    return str(data["id"])


def create_test_reservation(client: FlaskClient, token: str, space_id: str) -> str:
    """Helper to create a test reservation and return its ID"""
    # First create a car for the reservation
    car_id = create_test_car(client, token)

    start_time = datetime.now(timezone.utc) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=1)

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
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    return str(data["id"])