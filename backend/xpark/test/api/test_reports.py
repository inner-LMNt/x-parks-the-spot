from flask.testing import FlaskClient
from typing import Dict, cast
from uuid import UUID

def test_reports(client: FlaskClient) -> None:
    # Register a test user
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "testreports@example.com",
            "full_name": "Test Reporter",
            "password": "TestPass123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]

    # Create a test reservation first (assuming endpoint exists)
    response = client.post(
        "/api/unstable/reservations",
        headers={"Authorization": "Bearer " + token},
        json={
            "start_time": "2024-12-01T10:00:00Z",
            "end_time": "2024-12-01T11:00:00Z",

        },
    )
    assert response.status_code == 201
    reservation_id = response.json["id"]

    # Test creating a report
    response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": "Bearer " + token},
        json={
            "reservation_id": reservation_id,
            "description": "Test report description",
            "type": "issue"
        },
    )
    assert response.status_code == 201
    assert response.json
    report_id = response.json["id"]

    # Test getting all reports for the user
    response = client.get(
        "/api/unstable/reports",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    assert len(response.json) > 0
    assert response.json[0]["description"] == "Test report description"

    # Test getting a specific report
    response = client.get(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["description"] == "Test report description"

    # Test updating report admin response
    response = client.put(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": "Bearer " + token},
        json={
            "admin_response": "Admin response to the test report"
        },
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["admin_response"] == "Admin response to the test report"

    # Test getting non-existent report
    fake_uuid = str(UUID('00000000-0000-0000-0000-000000000000'))
    response = client.get(
        f"/api/unstable/reports/{fake_uuid}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 404

    # Test invalid UUID format
    response = client.get(
        "/api/unstable/reports/invalid-uuid",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 400

    # Test creating report with missing required fields
    response = client.post(
        "/api/unstable/reports",
        headers={"Authorization": "Bearer " + token},
        json={
            "description": "Test report description"
        },
    )
    assert response.status_code == 400

    # Test updating report with missing admin_response
    response = client.put(
        f"/api/unstable/reports/{report_id}",
        headers={"Authorization": "Bearer " + token},
        json={},
    )
    assert response.status_code == 400


def test_reports_unauthorized(client: FlaskClient) -> None:
    # Test accessing endpoints without authentication
    response = client.get("/api/unstable/reports")
    assert response.status_code == 401

    response = client.post(
        "/api/unstable/reports",
        json={
            "reservation_id": str(UUID('00000000-0000-0000-0000-000000000000')),
            "description": "Test description",
            "type": "issue"
        },
    )
    assert response.status_code == 401

    fake_uuid = str(UUID('00000000-0000-0000-0000-000000000000'))
    response = client.get(f"/api/unstable/reports/{fake_uuid}")
    assert response.status_code == 401

    response = client.put(
        f"/api/unstable/reports/{fake_uuid}",
        json={"admin_response": "Test response"},
    )
    assert response.status_code == 401