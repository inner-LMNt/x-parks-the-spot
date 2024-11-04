from flask.testing import FlaskClient
from uuid import uuid4
from ..utils.utils import create_test_user, create_test_parking_space, create_test_reservation, create_test_conflict

def test_get_all_conflicts(client: FlaskClient) -> None:
    """Test fetching all open conflicts (non-resolved reports)."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")  # Different user for reservation
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)
    conflict_id = create_test_conflict(client, user_token, reservation_id)

    response = client.get(
        "/api/unstable/admin/get-conflicts",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert any(conflict["id"] == str(conflict_id) for conflict in data), "Expected conflict ID not found."

def test_update_conflict_response_success(client: FlaskClient) -> None:
    """Test successful admin response update to a conflict."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)
    conflict_id = create_test_conflict(client, user_token, reservation_id)

    response_text = "This issue has been resolved by admin."
    response = client.post(
        "/api/unstable/admin/update-conflict",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"id": str(conflict_id), "response": response_text}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["status"] == "resolved"
    assert data["admin_response"] == response_text

def test_update_conflict_invalid_id(client: FlaskClient) -> None:
    """Test updating a conflict with an invalid conflict ID format."""
    admin_token = create_test_user(client)
    invalid_id = "invalid-uuid"

    response = client.post(
        "/api/unstable/admin/update-conflict",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"id": invalid_id, "response": "Resolved"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert data["error"] == "Invalid conflict ID format"

def test_update_conflict_nonexistent(client: FlaskClient) -> None:
    """Test updating a non-existent conflict."""
    admin_token = create_test_user(client)
    fake_conflict_id = str(uuid4())  # Generate a random UUID

    response = client.post(
        "/api/unstable/admin/update-conflict",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"id": fake_conflict_id, "response": "Resolved"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert "not found" in data["error"]

def test_update_conflict_missing_response_text(client: FlaskClient) -> None:
    """Test updating a conflict without providing a response text."""
    admin_token = create_test_user(client)
    user_token = create_test_user(client, "user@example.com")
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)
    conflict_id = create_test_conflict(client, user_token, reservation_id)

    response = client.post(
        "/api/unstable/admin/update-conflict",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"id": str(conflict_id)}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert data["error"] == "Conflict ID and response text are required"

def test_get_specific_conflict(client: FlaskClient) -> None:
    """Test retrieving a specific conflict by its ID."""
    user_token = create_test_user(client)
    space_id = create_test_parking_space(client, user_token)
    reservation_id = create_test_reservation(client, user_token, space_id)
    conflict_id = create_test_conflict(client, user_token, reservation_id)

    response = client.get(
        f"/api/unstable/reports/{conflict_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["id"] == str(conflict_id)

def test_get_nonexistent_conflict(client: FlaskClient) -> None:
    """Test retrieving a conflict that does not exist."""
    user_token = create_test_user(client)
    fake_conflict_id = str(uuid4())

    response = client.get(
        f"/api/unstable/reports/{fake_conflict_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 404
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert data["error"] == "Report not found"
