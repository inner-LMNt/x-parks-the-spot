import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from flask.testing import FlaskClient
import pytest

# Import utility functions
from xpark.test.utils.utils import (
    create_test_user,
    create_test_parking_space,
    create_test_car,
    create_test_reservation_at_time, get_user_id_from_token, insert_reservation_directly,
)

def test_basic_analytics_response_structure(client: FlaskClient):
    """Test that the analytics endpoint returns the expected data structure."""
    # Create an owner user
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    # Create a parking space
    space_id = create_test_parking_space(client, token=owner_token)

    # Make a GET request to the analytics endpoint
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, f"Failed to get analytics data: {response.get_json()}"
    data = response.get_json()
    assert data is not None

    # Check that the response contains the expected top-level keys
    expected_keys = ["overallMetrics", "revenueMetrics", "bookingMetrics", "spotPerformance", "upcomingEarnings"]
    for key in expected_keys:
        assert key in data, f"Key '{key}' not found in analytics data"

def test_analytics_with_no_data(client: FlaskClient):
    """Test that the analytics endpoint returns zeros or empty lists when there is no data."""
    # Create an owner user
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    # Make a GET request to the analytics endpoint
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    # Check that numerical metrics are zero and lists are empty
    overall_metrics = data.get("overallMetrics", {})
    revenue_metrics = data.get("revenueMetrics", {})
    booking_metrics = data.get("bookingMetrics", {})
    spot_performance = data.get("spotPerformance", {})
    upcoming_earnings = data.get("upcomingEarnings", {})

    assert overall_metrics.get("revenue", {}).get("total", 1) == 0
    assert overall_metrics.get("bookings", {}).get("total", 1) == 0
    assert isinstance(revenue_metrics.get("monthlyRevenue", []), list)
    assert len(revenue_metrics.get("monthlyRevenue", [1])) == 0
    assert isinstance(booking_metrics.get("recentBookings", []), list)
    assert len(booking_metrics.get("recentBookings", [1])) == 0
    assert isinstance(spot_performance, dict)
    assert len(spot_performance) == 0
    assert upcoming_earnings.get("total", 1) == 0
    assert isinstance(upcoming_earnings.get("reservations", []), list)
    assert len(upcoming_earnings.get("reservations", [1])) == 0

def test_analytics_with_single_parking_space(client: FlaskClient):
    """Test analytics data when there is a single parking space and no reservations."""
    # Create an owner user
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    # Create a parking space
    space_id = create_test_parking_space(client, token=owner_token)

    # Make a GET request to the analytics endpoint
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    # Check that the spotPerformance contains the parking space
    spot_performance = data.get("spotPerformance", {})
    assert len(spot_performance) == 1
    assert space_id in spot_performance

def test_analytics_with_reservations(client: FlaskClient):
    """Test analytics data when there are reservations."""
    # Create an owner and a renter
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    renter_email = f"renter_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)
    renter_token = create_test_user(client, email=renter_email)

    # Create a parking space
    space_id = create_test_parking_space(client, token=owner_token)

    # Create a car for the renter
    car_id = create_test_car(client, token=renter_token)

    # Create reservations
    num_reservations = 5
    for i in range(num_reservations):
        start_time = datetime.now(timezone.utc) - timedelta(days=i+1)
        end_time = start_time + timedelta(hours=2)
        create_test_reservation_at_time(
            client,
            token=renter_token,
            space_id=space_id,
            start_time=start_time,
            end_time=end_time,
            car_id=car_id
        )

    # Make a GET request to the analytics endpoint
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    # Check that the overallMetrics reflect the reservations
    overall_metrics = data.get("overallMetrics", {})
    total_bookings = overall_metrics.get("bookings", {}).get("total", 0)
    assert total_bookings == num_reservations

    total_revenue = overall_metrics.get("revenue", {}).get("total", 0)
    assert total_revenue > 0

def test_analytics_with_time_filter(client: FlaskClient):
    """Test the analytics endpoint with different time filters."""
    # Create an owner and a renter
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    renter_email = f"renter_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)
    renter_token = create_test_user(client, email=renter_email)

    # Get user IDs from tokens
    renter_id = get_user_id_from_token(client, renter_token)

    # Create a parking space
    space_id = create_test_parking_space(client, token=owner_token)

    # Create a car for the renter
    car_id = create_test_car(client, token=renter_token)

    # Directly insert reservations over the past 60 days into the database
    num_reservations = 10
    for i in range(num_reservations):
        start_time = datetime.now(timezone.utc) - timedelta(days=i * 6)  # Every 6 days
        end_time = start_time + timedelta(hours=2)
        insert_reservation_directly(
            renter_id=renter_id,
            space_id=space_id,
            car_id=car_id,
            start_time=start_time,
            end_time=end_time
        )

    # Test with '7_days' filter
    response = client.get(
        "/api/unstable/analytics/dashboard",
        query_string={'time_filter': '7_days'},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, f"Failed with status {response.status_code}: {response.get_json()}"
    data_7_days = response.get_json()
    total_bookings_7_days = data_7_days.get("overallMetrics", {}).get("bookings", {}).get("total", 0)

    # Test with '30_days' filter
    response = client.get(
        "/api/unstable/analytics/dashboard",
        query_string={'time_filter': '30_days'},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, f"Failed with status {response.status_code}: {response.get_json()}"
    data_30_days = response.get_json()
    total_bookings_30_days = data_30_days.get("overallMetrics", {}).get("bookings", {}).get("total", 0)

    # Test with '1_year' filter
    response = client.get(
        "/api/unstable/analytics/dashboard",
        query_string={'time_filter': '1_year'},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, f"Failed with status {response.status_code}: {response.get_json()}"
    data_1_year = response.get_json()
    total_bookings_1_year = data_1_year.get("overallMetrics", {}).get("bookings", {}).get("total", 0)

    # Check that the number of bookings increases with longer time filters
    assert total_bookings_7_days <= total_bookings_30_days <= total_bookings_1_year



def test_analytics_with_invalid_time_filter(client: FlaskClient):
    """Test that the analytics endpoint returns an error with an invalid time filter."""
    # Create an owner user
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    # Make a GET request with an invalid time_filter
    response = client.get(
        "/api/unstable/analytics/dashboard?time_filter=invalid_filter",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    # Expecting a 400 Bad Request
    assert response.status_code == 400, f"Expected status code 400, got {response.status_code}"

def test_analytics_with_spot_id_filter(client: FlaskClient):
    """Test the analytics endpoint with a specific parking space (spot_id) filter."""
    # Create an owner and a renter
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    renter_email = f"renter_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)
    renter_token = create_test_user(client, email=renter_email)

    # Create two parking spaces
    space_id_1 = create_test_parking_space(client, token=owner_token, name="Space 1")
    space_id_2 = create_test_parking_space(client, token=owner_token, name="Space 2")

    # Create a car for the renter
    car_id = create_test_car(client, token=renter_token)

    # Create reservations for both spaces
    start_time = datetime.now(timezone.utc) - timedelta(days=1)
    end_time = start_time + timedelta(hours=2)
    create_test_reservation_at_time(
        client,
        token=renter_token,
        space_id=space_id_1,
        start_time=start_time,
        end_time=end_time,
        car_id=car_id
    )
    create_test_reservation_at_time(
        client,
        token=renter_token,
        space_id=space_id_2,
        start_time=start_time,
        end_time=end_time,
        car_id=car_id
    )

    # Get analytics for space_id_1
    response = client.get(
        f"/api/unstable/analytics/dashboard?spot_id={space_id_1}",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data_space_1 = response.get_json()
    spot_performance_1 = data_space_1.get("spotPerformance", {})
    assert space_id_1 in spot_performance_1
    assert space_id_2 not in spot_performance_1

    # Get analytics for space_id_2
    response = client.get(
        f"/api/unstable/analytics/dashboard?spot_id={space_id_2}",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data_space_2 = response.get_json()
    spot_performance_2 = data_space_2.get("spotPerformance", {})
    assert space_id_2 in spot_performance_2
    assert space_id_1 not in spot_performance_2

def test_analytics_upcoming_earnings(client: FlaskClient):
    """Test the upcoming earnings data."""
    # Create an owner and a renter
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    renter_email = f"renter_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)
    renter_token = create_test_user(client, email=renter_email)

    # Create a parking space
    space_id = create_test_parking_space(client, token=owner_token)

    # Create a car for the renter
    car_id = create_test_car(client, token=renter_token)

    # Create future reservations within the next 7 days
    num_reservations = 3
    for i in range(num_reservations):
        start_time = datetime.now(timezone.utc) + timedelta(days=i+1)
        end_time = start_time + timedelta(hours=2)
        create_test_reservation_at_time(
            client,
            token=renter_token,
            space_id=space_id,
            start_time=start_time,
            end_time=end_time,
            car_id=car_id
        )

    # Make a GET request to the analytics endpoint
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    upcoming_earnings = data.get("upcomingEarnings", {})
    total_upcoming = upcoming_earnings.get("total", 0)
    reservations = upcoming_earnings.get("reservations", [])

    assert total_upcoming > 0
    assert len(reservations) == num_reservations

def test_analytics_with_no_auth(client: FlaskClient):
    """Test that the analytics endpoint returns 401 when no authorization is provided."""
    response = client.get("/api/unstable/analytics/dashboard")
    assert response.status_code == 403, f"Expected status code 403, got {response.status_code}"
