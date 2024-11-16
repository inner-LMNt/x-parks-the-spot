from datetime import datetime, timezone, timedelta

from flask.testing import FlaskClient
from ..utils.utils import create_test_user, create_test_parking_space, create_test_reservation, create_test_report, \
    create_test_car


def test_get_all_conflicts(client: FlaskClient) -> None:
    """Test fetching all open conflicts (non-resolved reports)."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)

    # Create a report to show up in conflicts
    report = create_test_report(
        client,
        user_token,
        "Reservation Issue",
        reservation_id=reservation_id,
        description="Test conflict"
    )

    response = client.get(
        "/api/unstable/admin/get-conflicts",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert any(conflict["id"] == report["id"] for conflict in data), "Expected conflict ID not found."


def test_update_conflict_response_success(client: FlaskClient) -> None:
    """Test successful admin response update to a conflict."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)

    # Create initial report
    report = create_test_report(
        client,
        user_token,
        "Reservation Issue",
        reservation_id=reservation_id,
        description="Test conflict"
    )

    response_text = "This issue has been resolved by admin."
    response = client.post(
        "/api/unstable/admin/update-conflict",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "id": report["id"],
            "response": response_text
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["status"] == "resolved"
    assert data["admin_response"] == response_text


def test_verify_parking_space_success(client: FlaskClient) -> None:
    """Test successful verification of a parking space."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")
    space_id = create_test_parking_space(client, user_token)

    response = client.post(
        "/api/unstable/admin/verify-parking-space",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "spotId": space_id,
            "is_verified": True
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["verification_status"] == "verified"


def test_verify_parking_space_invalid_id(client: FlaskClient) -> None:
    """Test verifying a parking space with invalid ID."""
    admin_token = create_test_user(client)

    response = client.post(
        "/api/unstable/admin/verify-parking-space",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "spotId": "invalid-uuid",
            "is_verified": True
        }
    )
    assert response.status_code == 401
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert "Invalid parking_space_id format" in data["error"]


def test_get_cancellations(client: FlaskClient) -> None:
    """Test fetching cancellations."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")

    # Setup: Create and cancel a reservation
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)

    # Cancel the reservation
    client.post(
        f"/api/unstable/reservations/{reservation_id}/cancel",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    response = client.get(
        "/api/unstable/admin/get-cancellations",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert any(cancellation["id"] == reservation_id for cancellation in data)


def test_acknowledge_cancellation_success(client: FlaskClient) -> None:
    """Test acknowledging a cancellation."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")

    # Setup: Create and cancel a reservation
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)
    client.post(
        f"/api/unstable/reservations/{reservation_id}/cancel",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    # Acknowledge the cancellation
    response = client.post(
        "/api/unstable/admin/acknowledge-cancellation",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"id": reservation_id}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert "message" in data
    assert data["message"] == "Cancellation acknowledged"

def test_admin_delete_parking_space_success(client: FlaskClient) -> None:
    """Test successful deletion of a paid parking space."""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token, is_paid=True)

    response = client.delete(
        f"/api/unstable/admin/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Space no longer meets our requirements"}
    )

    assert response.status_code == 200

    # Verify parking space is gone
    space_response = client.get(
        f"/api/unstable/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert space_response.status_code == 404


def test_admin_delete_parking_space_with_reservations(client: FlaskClient) -> None:
    """Test deletion of a paid parking space with future reservations."""
    token = create_test_user(client)
    renter_token = create_test_user(client, "renter@example.com")

    # Create multiple reservations at different times
    space_id = create_test_parking_space(client, token, is_paid=True)

    # First reservation starting in 1 hour
    reservation_id1 = create_test_reservation(client, renter_token, space_id)

    # Second reservation starting in 3 hours
    start_time = datetime.now(timezone.utc) + timedelta(hours=3)
    end_time = start_time + timedelta(hours=1)

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
    reservation_id2 = response.get_json()["id"]

    # Now delete the parking space
    response = client.delete(
        f"/api/unstable/admin/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Space no longer meets our requirements"}
    )

    assert response.status_code == 200

    # Verify parking space is gone
    space_response = client.get(
        f"/api/unstable/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert space_response.status_code == 404

    # Verify all reservations are gone
    reservation_response1 = client.get(
        f"/api/unstable/reservations/{reservation_id1}",
        headers={"Authorization": f"Bearer {renter_token}"}
    )
    assert reservation_response1.status_code == 404

    reservation_response2 = client.get(
        f"/api/unstable/reservations/{reservation_id2}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert reservation_response2.status_code == 404
def test_admin_delete_non_paid_parking_space(client: FlaskClient) -> None:
    """Test attempt to delete a non-paid parking space."""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token, is_paid=False)

    response = client.delete(
        f"/api/unstable/admin/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Test reason"}
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "not a paid spot" in data["err"]

    # Verify parking space still exists
    space_response = client.get(
        f"/api/unstable/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert space_response.status_code == 200


def test_admin_delete_nonexistent_parking_space(client: FlaskClient) -> None:
    """Test attempt to delete a non-existent parking space."""
    token = create_test_user(client)

    response = client.delete(
        "/api/unstable/admin/parking-spaces/123e4567-e89b-12d3-a456-426614174000",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Test reason"}
    )

    assert response.status_code == 404
    data = response.get_json()
    assert data["err"] == "Parking space not found"


def test_admin_delete_parking_space_missing_reason(client: FlaskClient) -> None:
    """Test deletion attempt without providing a reason."""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token, is_paid=True)

    response = client.delete(
        f"/api/unstable/admin/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={}
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "reason are required" in data["error"]

    # Verify parking space still exists
    space_response = client.get(
        f"/api/unstable/parking-spaces/{space_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert space_response.status_code == 200


def test_admin_delete_parking_space_invalid_id_format(client: FlaskClient) -> None:
    """Test deletion attempt with invalid UUID format."""
    token = create_test_user(client)

    response = client.delete(
        "/api/unstable/admin/parking-spaces/invalid-uuid",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Test reason"}
    )

    assert response.status_code == 400