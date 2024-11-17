from flask.testing import FlaskClient
from uuid import uuid4
from ..utils.utils import (
    create_test_user,
    create_test_parking_space,
    submit_parking_verification,
)


def test_get_pending_parking_spaces(client: FlaskClient) -> None:
    """Test fetching all pending parking spaces."""
    admin_token = create_test_user(client)
    space_id = create_test_parking_space(client, admin_token)

    # Submit verification to set status to 'pending'
    submit_parking_verification(client, admin_token, space_id)

    response = client.get(
        "/api/unstable/admin/get-pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert "pendingSpaces" in data
    assert len(data["pendingSpaces"]) > 0


def test_verify_parking_space_success(client: FlaskClient) -> None:
    """Test successful verification by an admin for a pending space."""
    admin_token = create_test_user(client)
    space_id = create_test_parking_space(client, admin_token)

    # First submit verification to change to pending
    submit_parking_verification(client, admin_token, space_id)

    # Admin verifies the pending space
    response = client.post(
        "/api/unstable/admin/verify-parking-space",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"spotId": str(space_id), "is_verified": True},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["verification_status"] == "verified"


def test_verify_parking_space_rejection(client: FlaskClient) -> None:
    """Test rejection of a parking space verification by an admin."""
    admin_token = create_test_user(client)
    space_id = create_test_parking_space(client, admin_token)

    # Submit verification to update status to "pending"
    submit_parking_verification(client, admin_token, space_id)

    # Admin rejects the verification request
    response = client.post(
        "/api/unstable/admin/verify-parking-space",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"spotId": str(space_id), "is_verified": False},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["verification_status"] == "rejected"


def test_verify_parking_space_invalid_id(client: FlaskClient) -> None:
    """Test verifying a parking space with an invalid UUID."""
    admin_token = create_test_user(client)
    invalid_id = "invalid-uuid"

    response = client.post(
        "/api/unstable/admin/verify-parking-space",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"spotId": invalid_id, "is_verified": True},
    )
    assert response.status_code == 401
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert data["error"] == "Invalid parking_space_id format"


def test_verify_parking_space_nonexistent(client: FlaskClient) -> None:
    """Test verifying a non-existent parking space."""
    admin_token = create_test_user(client)
    fake_space_id = str(uuid4())  # Generate a random UUID

    response = client.post(
        "/api/unstable/admin/verify-parking-space",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"spotId": fake_space_id, "is_verified": True},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert "not found" in data["error"]


def test_verify_parking_space_without_photo(client: FlaskClient) -> None:
    """Test verification submission without a photo."""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    response = client.post(
        f"/api/unstable/parking-spaces/{space_id}/verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None


def test_verify_parking_space_photo_submission_success(client: FlaskClient) -> None:
    """Test successful photo submission for parking space verification."""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    # Use the helper function to simulate uploading a photo file
    submit_parking_verification(client, token, space_id)

    response = client.get(f"/api/unstable/parking-spaces/{space_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["verification_status"] == "pending"
