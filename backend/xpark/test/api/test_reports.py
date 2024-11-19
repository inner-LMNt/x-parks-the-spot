from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

from flask.testing import FlaskClient
from uuid import UUID
from ..utils.utils import (
    create_test_user,
    create_test_parking_space,
    create_test_reservation,
    create_test_report,
    create_test_reservation_at_time,
    create_test_image,
)


def test_create_basic_reports(client: FlaskClient) -> None:
    """Test creation of all report types"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Test Other report
    other_report = create_test_report(
        client, token, "Other", description="General issue with the system"
    )
    assert other_report["type"] == "Other"
    assert other_report["status"] == "open"

    # Test Reservation Issue report
    res_report = create_test_report(
        client,
        token,
        "Reservation Issue",
        reservation_id=reservation_id,
        description="Issue with reservation timing",
    )
    assert res_report["type"] == "Reservation Issue"
    assert res_report["reservation_id"] == reservation_id

    # Test Damage Report
    damage_report = create_test_report(
        client,
        token,
        "Damage Report",
        reservation_id=reservation_id,
        description="Scratch on the barrier",
        damage_type="scratch",
        damage_severity="Minor",
    )
    assert damage_report["type"] == "Damage Report"
    assert damage_report["damage_type"] == "scratch"
    assert damage_report["damage_severity"] == "Minor"
    assert "image_url" in damage_report

    # Test Renter Overstay report
    departure_time = datetime.now(timezone.utc) + timedelta(hours=1)
    overstay_report = create_test_report(
        client,
        token,
        "Renter Overstay",
        reservation_id=reservation_id,
        description="Vehicle left late",
        departure_time=departure_time,
    )
    assert overstay_report["type"] == "Renter Overstay"
    assert "overstay_duration" in overstay_report
    assert "overstay_charge" in overstay_report
    assert "image_url" in overstay_report


def test_get_user_reports(client: FlaskClient) -> None:
    """Test retrieving user's reports"""
    token = create_test_user(client)

    # Create an Other type report (doesn't need reservation)
    create_test_report(client, token, "Other", description="Test report for listing")

    # Get all reports
    response = client.get(
        "/api/unstable/reports", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    reports = response.get_json()
    assert len(reports) >= 1
    assert reports[0]["type"] in [
        "Other",
        "Reservation Issue",
        "Renter Overstay",
        "Damage Report",
    ]


def test_get_specific_report(client: FlaskClient) -> None:
    """Test getting a specific report"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a report
    created_report = create_test_report(
        client, token, "Damage Report", reservation_id=reservation_id
    )

    # Get the report
    response = client.get(
        f"/api/unstable/reports/{created_report['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    report = response.get_json()

    # Verify the details
    assert report["id"] == created_report["id"]
    assert report["type"] == "Damage Report"
    assert "image_url" in report


def test_update_report_admin_response(client: FlaskClient) -> None:
    """Test updating report's admin response"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a report
    report = create_test_report(
        client, token, "Reservation Issue", reservation_id=reservation_id
    )

    # Update with admin response
    response = client.put(
        f"/api/unstable/reports/{report['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"admin_response": "Issue has been resolved"},
    )
    assert response.status_code == 200
    updated_report = response.get_json()

    assert updated_report["admin_response"] == "Issue has been resolved"
    assert updated_report["status"] == "resolved"


def test_report_permissions(client: FlaskClient) -> None:
    """Test report access permissions"""
    token1 = create_test_user(client, "user1@example.com")
    token2 = create_test_user(client, "user2@example.com")

    # Create a report as first user
    report = create_test_report(
        client, token1, "Other", description="Test report for permissions"
    )

    # Try to access with second user
    response = client.get(
        f"/api/unstable/reports/{report['id']}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert response.status_code == 400


def test_overstay_calculations(client: FlaskClient) -> None:
    """Test overstay duration and charge calculations"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token, price=5.0)

    # Create a reservation that ended 1 hour ago
    end_time = datetime.now(timezone.utc) - timedelta(hours=1)
    start_time = end_time - timedelta(hours=2)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id, start_time=start_time, end_time=end_time
    )

    # Report departure time 30 minutes after end time
    departure_time = end_time + timedelta(minutes=30)

    report = create_test_report(
        client,
        token,
        "Renter Overstay",
        reservation_id=reservation_id,
        description="Testing overstay calculations",
        departure_time=departure_time,
    )

    assert report["overstay_duration"] == 30
    assert round(float(report["overstay_charge"]), 2) == round(5 * 1.5 * 0.5, 2)

    # Report departure time 1 hour after end time
    departure_time = end_time + timedelta(hours=1)

    report = create_test_report(
        client,
        token,
        "Renter Overstay",
        reservation_id=reservation_id,
        description="Testing overstay calculations",
        departure_time=departure_time,
    )

    assert report["overstay_duration"] == 60
    assert round(float(report["overstay_charge"]), 2) == round(5 * 1.5, 2)


def test_damage_severity_values(client: FlaskClient) -> None:
    """Test damage report creation with different severity levels"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    for severity in ["Minor", "Moderate", "Severe"]:
        report = create_test_report(
            client,
            token,
            "Damage Report",
            reservation_id=reservation_id,
            description="Testing damage severity",
            damage_type="scratch",
            damage_severity=severity,
        )
        assert report["damage_severity"] == severity


def test_reservation_timestamps(client: FlaskClient) -> None:
    """Test report creation with different timezone scenarios"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)

    # Create a reservation with explicit timezone
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=2)
    reservation_id = create_test_reservation_at_time(
        client, token, space_id, start_time=start_time, end_time=end_time
    )

    # Test creating overstay report with different timezone formats
    time_formats = [
        (end_time + timedelta(minutes=30), "UTC time"),
        (end_time.replace(tzinfo=None) + timedelta(minutes=30), "Naive time"),
        (
            (end_time + timedelta(minutes=30)).astimezone(timezone.utc),
            "Converted UTC time",
        ),
    ]

    for departure_time, scenario in time_formats:
        report = create_test_report(
            client,
            token,
            "Renter Overstay",
            reservation_id=reservation_id,
            description=f"Testing {scenario}",
            departure_time=departure_time,
        )
        assert "overstay_duration" in report
        assert "overstay_charge" in report


def test_get_report_by_id_full_details(client: FlaskClient) -> None:
    """Test that get_report_by_id returns all required fields"""
    token = create_test_user(client)
    space_id = create_test_parking_space(client, token)
    reservation_id = create_test_reservation(client, token, space_id)

    # Create a damage report with all possible fields
    original_report = create_test_report(
        client,
        token,
        "Damage Report",
        reservation_id=reservation_id,
        description="Testing full report details",
        damage_type="scratch",
        damage_severity="Moderate",
    )

    # Get the report details
    response = client.get(
        f"/api/unstable/reports/{original_report['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    report = response.get_json()

    # Verify all fields are present
    required_fields = [
        "id",
        "reservation_id",
        "user_id",
        "description",
        "type",
        "status",
        "created_at",
        "updated_at",
        "damage_type",
        "damage_severity",
        "image_url",
        "owner_name",
        "parking_space_name",
        "parking_space_address",
        "start_time",
        "end_time",
    ]

    for field in required_fields:
        assert field in report, f"Missing field: {field}"


def test_reservation_price_calculations(client: FlaskClient) -> None:
    """Test overstay charge calculations with different reservation prices"""
    token = create_test_user(client)

    space_id = create_test_parking_space(
        client, token, price=20.0, name="Test Price Space"
    )

    # Create reservation
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=1)
    reservation_id = create_test_reservation_at_time(
        client,
        token,
        space_id,
        start_time=start_time,
        end_time=end_time,
    )

    # Test 30 minute overstay
    departure_time = end_time + timedelta(minutes=30)
    report = create_test_report(
        client,
        token,
        "Renter Overstay",
        reservation_id=reservation_id,
        description="Testing price calculations",
        departure_time=departure_time,
    )

    # Verify calculations:
    # Base price = $20/hour
    # Overstay rate = 1.5x base rate
    # 30 minutes at 1.5x = (20 * 1.5) * (30/60) = $15
    assert round(float(report["overstay_charge"]), 2) == 15.00


def test_user_specific_report_listing(client: FlaskClient) -> None:
    """Test that users only see their own reports"""
    # Create two users
    token1 = create_test_user(client, "user1@example.com")
    token2 = create_test_user(client, "user2@example.com")

    # First user creates reports
    for _ in range(3):
        create_test_report(client, token1, "Other", description="User 1 report")

    # Second user creates reports
    for _ in range(2):
        create_test_report(client, token2, "Other", description="User 2 report")

    # Check user 1's reports
    response1 = client.get(
        "/api/unstable/reports", headers={"Authorization": f"Bearer {token1}"}
    )
    reports1 = response1.get_json()
    assert len(reports1) == 3

    # Check user 2's reports
    response2 = client.get(
        "/api/unstable/reports", headers={"Authorization": f"Bearer {token2}"}
    )
    reports2 = response2.get_json()
    assert len(reports2) == 2


def test_non_existent_reservation(client: FlaskClient) -> None:
    """Test handling of non-existent reservation IDs"""
    token = create_test_user(client)
    fake_uuid = str(UUID("00000000-0000-0000-0000-000000000000"))

    # Test with each report type that requires reservation
    test_cases = [
        ("reservation-issue", {"reservation_id": fake_uuid}),
        (
            "renter-overstay",
            {
                "owner_reservation_id": fake_uuid,
                "departure_time": datetime.now(timezone.utc).isoformat(),
                "image": create_test_image(),
            },
        ),
        (
            "damage-report",
            {
                "owner_reservation_id": fake_uuid,
                "damage_type": "scratch",
                "damage_severity": "Minor",
                "image": create_test_image(),
            },
        ),
    ]

    for endpoint, data in test_cases:
        data["description"] = "Testing non-existent reservation"  # type: ignore
        response = client.post(
            f"/api/unstable/reports/{endpoint}",
            headers={"Authorization": f"Bearer {token}"},
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 404


def test_report_status_after_update(client: FlaskClient) -> None:
    """Test report status changes after admin response"""
    token = create_test_user(client)

    # Create report
    report = create_test_report(
        client, token, "Other", description="Testing status updates"
    )
    assert report["status"] == "open"

    # Update with admin response
    response = client.put(
        f"/api/unstable/reports/{report['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"admin_response": "Resolved issue"},
    )
    updated_report = response.get_json()
    assert updated_report["status"] == "resolved"

    # Verify status via GET
    response = client.get(
        f"/api/unstable/reports/{report['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    current_report = response.get_json()
    assert current_report["status"] == "resolved"


def test_report_ordering(client: FlaskClient) -> None:
    """Test that reports are returned in correct order (newest first)"""
    token = create_test_user(client)

    # Create reports with different timestamps
    descriptions = ["First report", "Second report", "Third report"]

    created_reports = []
    for desc in descriptions:
        report = create_test_report(client, token, "Other", description=desc)
        created_reports.append(report)

    # Get reports
    response = client.get(
        "/api/unstable/reports", headers={"Authorization": f"Bearer {token}"}
    )
    reports = response.get_json()

    # Verify ordering
    assert len(reports) >= 3
    last_timestamp = datetime.max.replace(tzinfo=timezone.utc)

    for report in reports:
        # Parse RFC 1123 format datetime string
        current_timestamp = parsedate_to_datetime(report["created_at"])
        assert current_timestamp <= last_timestamp
        last_timestamp = current_timestamp


def test_left_join_completeness(client: FlaskClient) -> None:
    """Test that reports without reservations still return correctly"""
    token = create_test_user(client)

    # Create an 'Other' type report (no reservation)
    report = create_test_report(client, token, "Other", description="Testing SQL joins")

    # Get report details
    response = client.get(
        f"/api/unstable/reports/{report['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    detailed_report = response.get_json()

    # Verify fields are present but null where appropriate
    assert detailed_report["reservation_id"] is None
    assert detailed_report["parking_space_name"] is None
    assert detailed_report["owner_name"] is None
