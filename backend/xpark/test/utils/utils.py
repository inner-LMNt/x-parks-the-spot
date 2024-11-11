import uuid

from flask.testing import FlaskClient
from typing import Dict, Any, List, Union, Optional
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


def create_test_parking_space(client: FlaskClient,
                              token: str,
                              is_paid: bool = True,
                              price: float = 10.0,
                              name: str = "Test Space") -> str:
    """Helper to create a test parking space and return its ID"""
    # Create the parking space data

    parking_space_data: Dict[str, Any] = {
        "name": name if is_paid else None,
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
            "base_price": price
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


def create_test_car(client: FlaskClient, token: str, license_plate: Optional[str] = None) -> str:
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
            "license_plate_state": "CA"
        }
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
        car_id: Optional[str] = None
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
            "car_info_id": car_id
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

def create_sequential_reservations(
        client: FlaskClient,
        token: str,
        space_id: str,
        num_reservations: int,
        hours_between: int = 1
) -> list[str]:
    """Create multiple sequential reservations with gaps between them"""
    reservation_ids = []
    start_time = datetime.now(timezone.utc) + timedelta(hours=1)

    for i in range(num_reservations):
        end_time = start_time + timedelta(hours=1)
        reservation_id = create_test_reservation_at_time(
            client, token, space_id,
            start_time=start_time,
            end_time=end_time
        )
        reservation_ids.append(reservation_id)
        start_time = end_time + timedelta(hours=hours_between)

    return reservation_ids

def submit_parking_verification(client: FlaskClient, token: str, space_id: str) -> None:
    """Helper to submit a verification request for a parking space with an image."""
    # Create a dummy image file for verification
    image_data = io.BytesIO(b"dummy image content")
    image_file = FileStorage(
        stream=image_data,
        filename="verification.jpg",
        content_type="image/jpeg"
    )

    response = client.post(
        f"/api/unstable/parking-spaces/{space_id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        data={"image": image_file},
        content_type="multipart/form-data"
    )

    assert response.status_code == 200, f"Verification submission failed: {response.get_json()}"
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
        data = {
            "description": description,
            "reservation_id": reservation_id
        }
    elif conflict_type == "Damage Report":
        url = "/api/unstable/reports/damage-report"
        data = {
            "description": description,
            "owner_reservation_id": reservation_id,
            "damage_type": damage_type or "scratch",
            "damage_severity": damage_severity or "Minor"
        }
        if not image:
            image = create_test_image()
    elif conflict_type == "Renter Overstay":
        url = "/api/unstable/reports/renter-overstay"
        data = {
            "description": description,
            "owner_reservation_id": reservation_id,
            "departure_time": (departure_time or datetime.now(timezone.utc)).isoformat()
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
            content_type="multipart/form-data"
        )
    else:
        response = client.post(
            url,
            data=data,
            headers={"Authorization": f"Bearer {token}"},
            content_type="application/x-www-form-urlencoded"
        )

    assert response.status_code == 201, f"Expected 201, got {response.status_code} with response {response.data}"
    data = response.get_json()
    assert data is not None, "Expected non-empty response data"
    assert "id" in data, "Response missing 'id' key"

    return str(data["id"])

def update_conflict_response(
    client: FlaskClient,
    token: str,
    conflict_id: str,
    admin_response: str
) -> Dict[str, Any]:
    """
    Update the response for an existing conflict using the PUT endpoint.
    Returns the updated report data.
    """
    response = client.put(
        f"/api/unstable/reports/{conflict_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"admin_response": admin_response}
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
        data["reservation_id"] = reservation_id
    elif report_type == "Renter Overstay":
        url = "/api/unstable/reports/renter-overstay"
        data["owner_reservation_id"] = reservation_id
        data["departure_time"] = (departure_time or datetime.now(timezone.utc)).isoformat()
        if not image:
            image = create_test_image()
    elif report_type == "Damage Report":
        url = "/api/unstable/reports/damage-report"
        data["owner_reservation_id"] = reservation_id
        data["damage_type"] = damage_type or "scratch"
        data["damage_severity"] = damage_severity or "Minor"
        if not image:
            image = create_test_image()

    if image:
        files = {"image": image}
        response = client.post(
            url,
            data={**data, **files},
            headers={"Authorization": f"Bearer {token}"},
            content_type="multipart/form-data"
        )
    else:
        response = client.post(
            url,
            data=data,
            headers={"Authorization": f"Bearer {token}"},
            content_type="application/x-www-form-urlencoded"
        )

    assert response.status_code == 201, f"Failed to create report: {response.get_json()}"
    return response.get_json()

def create_test_image(filename: str = "test.jpg", content_type: str = "image/jpeg") -> FileStorage:
    """Create a test image file"""
    return FileStorage(
        stream=io.BytesIO(b"dummy image content"),
        filename=filename,
        content_type=content_type
    )
