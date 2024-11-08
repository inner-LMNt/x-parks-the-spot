from flask.testing import FlaskClient
from uuid import UUID
from ..utils.utils import (
    create_test_user,
    create_test_parking_space,
    create_test_reservation
)

def test_create_report_success(client: FlaskClient) -> None:
    """Test successful creation of a report"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "reservation_id": reservation_id,
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    assert data["description"] == "Test report"
    assert data["type"] == "Reservation Issue"
    assert data["status"] == "open"
    assert "id" in data, "Response missing report ID"

def test_create_report_missing_fields(client: FlaskClient) -> None:
    """Test report creation with missing required fields"""
    token = create_test_user(client)

    response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "description": "Test report"
        }
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "Missing required fields" in data["error"]

def test_get_user_reports(client: FlaskClient) -> None:
    """Test getting all reports for a user"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a test report first
    create_response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "reservation_id": reservation_id,
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert create_response.status_code == 201
    create_data = create_response.get_json()
    assert create_data is not None
    assert "id" in create_data, "Response missing report ID"

    response = client.get(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert len(data) > 0
    assert data[0]["description"] == "Test report"

def test_get_specific_report_success(client: FlaskClient) -> None:
    """Test getting a specific report by ID"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a test report first
    report_response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "reservation_id": reservation_id,
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert report_response.status_code == 201
    report_data = report_response.get_json()
    assert report_data is not None
    assert "id" in report_data, "Response missing report ID"
    report_id = str(report_data["id"])

    response = client.get(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["description"] == "Test report"

def test_get_nonexistent_report(client: FlaskClient) -> None:
    """Test getting a non-existent report"""
    token = create_test_user(client)
    fake_uuid = str(UUID('00000000-0000-0000-0000-000000000000'))

    response = client.get(
        f"/api/unstable/reports/{fake_uuid}",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404, f"Expected 404, got {response.status_code}"

def test_update_report_admin_response_success(client: FlaskClient) -> None:
    """Test successful update of report's admin response"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a test report first
    report_response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "reservation_id": reservation_id,
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert report_response.status_code == 201
    report_data = report_response.get_json()
    assert report_data is not None
    assert "id" in report_data, "Response missing report ID"
    report_id = str(report_data["id"])

    response = client.put(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "admin_response": "Issue resolved"
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data["admin_response"] == "Issue resolved"
    assert data["status"] == "resolved"

def test_update_report_empty_admin_response(client: FlaskClient) -> None:
    """Test updating report with empty admin response"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a test report first
    report_response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "reservation_id": reservation_id,
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert report_response.status_code == 201
    report_data = report_response.get_json()
    assert report_data is not None
    assert "id" in report_data, "Response missing report ID"
    report_id = str(report_data["id"])

    # Try to update with empty admin response
    response = client.put(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "admin_response": ""  # Empty response
        }
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert "Admin response cannot be empty" in data["error"]

def test_update_report_missing_response(client: FlaskClient) -> None:
    """Test updating report without admin response"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a test report first
    report_response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "reservation_id": reservation_id,
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert report_response.status_code == 201
    report_data = report_response.get_json()
    assert report_data is not None
    assert "id" in report_data, "Response missing report ID"
    report_id = str(report_data["id"])

    response = client.put(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data is not None
    assert "Admin response cannot be empty." in data["error"]

def test_endpoints_require_auth(client: FlaskClient) -> None:
    """Test that all endpoints require authentication"""
    # Test GET /reports
    response = client.get("/api/unstable/reports")
    assert response.status_code == 403

    # Test POST /reports
    response = client.post(
        "/api/unstable/reports",
        json={
            "reservation_id": str(UUID('00000000-0000-0000-0000-000000000000')),
            "description": "Test report",
            "type": "Reservation Issue"
        }
    )
    assert response.status_code == 403

    # Test GET /reports/{id}
    response = client.get(f"/api/unstable/reports/{str(UUID('00000000-0000-0000-0000-000000000000'))}")
    assert response.status_code == 403

    # Test PUT /reports/{id}
    response = client.put(
        f"/api/unstable/reports/{str(UUID('00000000-0000-0000-0000-000000000000'))}",
        json={"admin_response": "Test response"}
    )
    assert response.status_code == 403

def test_cross_user_access(client: FlaskClient) -> None:
    """Test that users cannot access other users' reports"""
    # Create first user and their report
    token1 = create_test_user(client, "user1@example.com")
    space_id = create_test_parking_space(client, token1)
    reservation_id = create_test_reservation(client, token1, space_id)

    report_response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": f"Bearer {token1}"},
        json={
            "reservation_id": reservation_id,
            "description": "User 1 report",
            "type": "Reservation Issue"
        }
    )
    assert report_response.status_code == 201
    report_data = report_response.get_json()
    report_id = str(report_data["id"])

    # Create second user and try to access first user's report
    token2 = create_test_user(client, "user2@example.com")

    response = client.get(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert response.status_code == 404

def test_create_report_types(client: FlaskClient) -> None:
    """Test report creation with all valid types"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    for report_type in ["Other", "Reservation Issue", "Renter Overstay", "Damage Report"]:
        response = client.post(
            "/api/unstable/reports",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reservation_id": reservation_id,
                "description": f"Test {report_type} report",
                "type": report_type
            }
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["type"] == report_type