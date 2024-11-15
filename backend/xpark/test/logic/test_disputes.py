from flask.testing import FlaskClient
from ..utils.utils import create_test_user, create_test_parking_space, create_test_reservation, create_test_report


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