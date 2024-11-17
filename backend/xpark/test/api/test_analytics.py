import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict

from flask.testing import FlaskClient

# Import utility functions
from xpark.test.utils.utils import (
    create_test_user,
    create_test_parking_space,
    create_test_car,
    create_test_reservation_at_time,
    get_user_id_from_token,
    insert_reservation_directly,
    mark_reservations_completed,
)

def test_basic_analytics_response_structure(client: FlaskClient) -> None:
    """Test that the analytics endpoint returns the expected data structure and contents."""
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

    # Validate 'overallMetrics' structure and contents
    overall_metrics = data["overallMetrics"]
    assert isinstance(overall_metrics, dict), "overallMetrics should be a dictionary"
    for metric in ["revenue", "occupancy", "bookings"]:
        assert metric in overall_metrics, f"'{metric}' key not found in overallMetrics"

    # Validate 'revenue' metrics
    revenue = overall_metrics["revenue"]
    for key in ["total", "perBooking", "trends"]:
        assert key in revenue, f"'{key}' key not found in revenue metrics"
    assert isinstance(revenue["trends"], list), "'trends' should be a list"

    # Validate 'occupancy' metrics
    occupancy = overall_metrics["occupancy"]
    for key in ["overallRate", "popularTimes"]:
        assert key in occupancy, f"'{key}' key not found in occupancy metrics"
    assert isinstance(occupancy["popularTimes"], list), "'popularTimes' should be a list"

    # Validate 'bookings' metrics
    bookings = overall_metrics["bookings"]
    for key in ["active", "total", "percentageActive"]:
        assert key in bookings, f"'{key}' key not found in bookings metrics"

    # Validate 'revenueMetrics' structure
    revenue_metrics = data["revenueMetrics"]
    expected_revenue_keys = ["monthlyRevenue", "dailyRevenue", "hourlyRevenue", "revenueBySpot"]
    for key in expected_revenue_keys:
        assert key in revenue_metrics, f"Key '{key}' not found in revenueMetrics"
        assert isinstance(revenue_metrics[key], list), f"'{key}' should be a list in revenueMetrics"

    # Validate 'bookingMetrics' structure
    booking_metrics = data["bookingMetrics"]
    assert "stats" in booking_metrics, "'stats' key not found in bookingMetrics"
    assert "recentBookings" in booking_metrics, "'recentBookings' key not found in bookingMetrics"
    assert isinstance(booking_metrics["stats"], dict), "'stats' should be a dictionary"
    assert isinstance(booking_metrics["recentBookings"], list), "'recentBookings' should be a list"

    # Validate 'spotPerformance' structure
    spot_performance = data["spotPerformance"]
    assert isinstance(spot_performance, dict), "spotPerformance should be a dictionary"
    assert space_id in spot_performance, f"Space ID {space_id} not found in spotPerformance"

    # Validate 'upcomingEarnings' structure
    upcoming_earnings = data["upcomingEarnings"]
    for key in ["total", "reservations"]:
        assert key in upcoming_earnings, f"'{key}' key not found in upcomingEarnings"
    assert isinstance(upcoming_earnings["reservations"], list), "'reservations' should be a list"

def test_analytics_with_no_data(client: FlaskClient) -> None:
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

    # Validate 'overallMetrics' contents
    revenue = overall_metrics.get("revenue", {})
    assert revenue.get("total", 1) == 0, "Expected total revenue to be 0"
    assert revenue.get("perBooking", 1) == 0, "Expected revenue per booking to be 0"
    assert revenue.get("trends", [1]) == [], "Expected revenue trends to be empty"

    occupancy = overall_metrics.get("occupancy", {})
    assert occupancy.get("overallRate", 1) == 0, "Expected overall occupancy rate to be 0"
    assert occupancy.get("popularTimes", [1]) == [], "Expected popularTimes to be empty"

    bookings = overall_metrics.get("bookings", {})
    assert bookings.get("active", 1) == 0, "Expected active bookings to be 0"
    assert bookings.get("total", 1) == 0, "Expected total bookings to be 0"
    assert bookings.get("percentageActive", 1) == 0, "Expected percentageActive to be 0"

    # Validate 'revenueMetrics' contents
    for key in ["monthlyRevenue", "dailyRevenue", "hourlyRevenue", "revenueBySpot"]:
        metric = revenue_metrics.get(key, [1])
        assert isinstance(metric, list), f"'{key}' should be a list"
        assert len(metric) == 0, f"Expected '{key}' to be empty"

    # Validate 'bookingMetrics' contents
    stats = booking_metrics.get("stats", {})
    for stat_key in ["total", "active", "completed", "canceled", "avgDuration", "completionRate"]:
        assert stats.get(stat_key, 1) == 0, f"Expected '{stat_key}' to be 0"
    recent_bookings = booking_metrics.get("recentBookings", [1])
    assert isinstance(recent_bookings, list), "'recentBookings' should be a list"
    assert len(recent_bookings) == 0, "Expected 'recentBookings' to be empty"

    # Validate 'spotPerformance' contents
    assert isinstance(spot_performance, dict), "spotPerformance should be a dictionary"
    assert len(spot_performance) == 0, "Expected 'spotPerformance' to be empty"

    # Validate 'upcomingEarnings' contents
    assert upcoming_earnings.get("total", 1) == 0, "Expected total upcoming earnings to be 0"
    reservations = upcoming_earnings.get("reservations", [1])
    assert isinstance(reservations, list), "'reservations' should be a list"
    assert len(reservations) == 0, "Expected 'reservations' to be empty"

def test_analytics_with_single_parking_space(client: FlaskClient) -> None:
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
    assert isinstance(spot_performance, dict), "spotPerformance should be a dictionary"
    assert len(spot_performance) == 1, "Expected one parking space in spotPerformance"
    assert space_id in spot_performance, f"Space ID {space_id} not found in spotPerformance"

    # Validate the contents of the parking space data
    spot_data = spot_performance[space_id]
    expected_keys = [
        "totalRevenue", "totalBookings", "occupancyRate", "averageBookingLength",
        "activeBookings", "completedBookings", "canceledBookings",
        "popularHours", "popularDays"
    ]
    for key in expected_keys:
        assert key in spot_data, f"Key '{key}' not found in spot data"
    assert spot_data["totalRevenue"] == 0, "Expected totalRevenue to be 0"
    assert spot_data["totalBookings"] == 0, "Expected totalBookings to be 0"
    assert spot_data["occupancyRate"] == 0, "Expected occupancyRate to be 0"
    assert spot_data["averageBookingLength"] == 0, "Expected averageBookingLength to be 0"
    assert spot_data["activeBookings"] == 0, "Expected activeBookings to be 0"
    assert spot_data["completedBookings"] == 0, "Expected completedBookings to be 0"
    assert spot_data["canceledBookings"] == 0, "Expected canceledBookings to be 0"
    assert spot_data["popularHours"] == [], "Expected popularHours to be empty"
    assert spot_data["popularDays"] == [], "Expected popularDays to be empty"

def test_analytics_with_reservations(client: FlaskClient) -> None:
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
    reservation_ids = []
    for i in range(num_reservations):
        start_time = datetime.now(timezone.utc) - timedelta(days=i+1)
        end_time = start_time + timedelta(hours=2)
        reservation_id = create_test_reservation_at_time(
            client,
            token=renter_token,
            space_id=space_id,
            start_time=start_time,
            end_time=end_time,
            car_id=car_id
        )
        reservation_ids.append(reservation_id)

    # Mark reservations as completed
    mark_reservations_completed(reservation_ids)

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
    assert total_bookings == num_reservations, f"Expected total bookings to be {num_reservations}"

    total_revenue = overall_metrics.get("revenue", {}).get("total", 0)
    assert total_revenue > 0, "Expected total revenue to be greater than 0"

    # Validate 'bookingMetrics' stats
    booking_stats = data.get("bookingMetrics", {}).get("stats", {})
    assert booking_stats.get("total", 0) == num_reservations, f"Expected total bookings to be {num_reservations}"
    assert booking_stats.get("completed", 0) == num_reservations, f"Expected completed bookings to be {num_reservations}"
    assert booking_stats.get("active", 0) == 0, "Expected active bookings to be 0"

    # Validate 'spotPerformance' data
    spot_performance = data.get("spotPerformance", {})
    assert space_id in spot_performance, f"Space ID {space_id} not found in spotPerformance"
    spot_data = spot_performance[space_id]
    assert spot_data["totalBookings"] == num_reservations, f"Expected totalBookings to be {num_reservations}"
    assert spot_data["totalRevenue"] == total_revenue, "Expected totalRevenue to match overall revenue"

def test_analytics_with_time_filter(client: FlaskClient) -> None:
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
    reservation_dates = []
    for i in range(num_reservations):
        days_ago = i * 6  # Every 6 days
        start_time = datetime.now(timezone.utc) - timedelta(days=days_ago)
        end_time = start_time + timedelta(hours=2)
        insert_reservation_directly(
            renter_id=renter_id,
            space_id=space_id,
            car_id=car_id,
            start_time=start_time,
            end_time=end_time
        )
        reservation_dates.append(start_time)

    now = datetime.now(timezone.utc)

    # Calculate expected bookings based on actual dates
    expected_bookings_7_days = sum(1 for date in reservation_dates if (now - date).days < 7)
    expected_bookings_30_days = sum(1 for date in reservation_dates if (now - date).days < 30)
    expected_bookings_1_year = num_reservations

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
    assert total_bookings_7_days <= total_bookings_30_days <= total_bookings_1_year, \
        "Bookings should increase with longer time filters"

    # Use calculated expected bookings in assertions
    assert total_bookings_7_days == expected_bookings_7_days, \
        f"Expected {expected_bookings_7_days} bookings for 7_days, got {total_bookings_7_days}"
    assert total_bookings_30_days == expected_bookings_30_days, \
        f"Expected {expected_bookings_30_days} bookings for 30_days, got {total_bookings_30_days}"
    assert total_bookings_1_year == expected_bookings_1_year, \
        f"Expected {expected_bookings_1_year} bookings for 1_year, got {total_bookings_1_year}"

def test_analytics_with_invalid_time_filter(client: FlaskClient) -> None:
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
    data = response.get_json()
    assert "err" in data, "Expected error message in response"

def test_analytics_with_spot_id_filter(client: FlaskClient) -> None:
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
    assert space_id_1 in spot_performance_1, f"Space ID {space_id_1} should be in spotPerformance"
    assert space_id_2 not in spot_performance_1, f"Space ID {space_id_2} should not be in spotPerformance"

    # Get analytics for space_id_2
    response = client.get(
        f"/api/unstable/analytics/dashboard?spot_id={space_id_2}",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200
    data_space_2 = response.get_json()
    spot_performance_2 = data_space_2.get("spotPerformance", {})
    assert space_id_2 in spot_performance_2, f"Space ID {space_id_2} should be in spotPerformance"
    assert space_id_1 not in spot_performance_2, f"Space ID {space_id_1} should not be in spotPerformance"

def test_analytics_upcoming_earnings(client: FlaskClient) -> None:
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

    assert total_upcoming > 0, "Expected total upcoming earnings to be greater than 0"
    assert len(reservations) == num_reservations, f"Expected {num_reservations} upcoming reservations"

def test_analytics_with_no_auth(client: FlaskClient) -> None:
    """Test that the analytics endpoint returns 403 when no authorization is provided."""
    response = client.get("/api/unstable/analytics/dashboard")
    assert response.status_code == 403, f"Expected status code 403, got {response.status_code}"
    data = response.get_json()
    assert "err" in data, "Expected error message in response"

def test_analytics_no_and_single_rating(client: FlaskClient) -> None:
    """Test analytics when no ratings exist and after a single rating is submitted."""
    # Create an owner and a renter
    owner_email = f"owner_no_single_{uuid.uuid4().hex}@example.com"
    renter_email = f"renter_no_single_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)
    renter_token = create_test_user(client, email=renter_email)

    # Get user ID
    renter_id = get_user_id_from_token(client, renter_token)

    # Create a paid parking space
    spot_id = create_test_parking_space(client, token=owner_token, is_paid=True)

    # Initially, no ratings should exist
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, f"Failed to get analytics data: {response.get_json()}"
    data = response.get_json()
    assert data is not None

    # Validate 'ratingMetrics' with no ratings
    rating_metrics = data.get("ratingMetrics", {})
    assert rating_metrics, "ratingMetrics should be present in the analytics data"

    # Check average ratings
    average_ratings = rating_metrics.get("averageRatings", {})
    assert average_ratings["availability"] == 0.0, "Expected average availability rating to be 0.0"
    assert average_ratings["cleanliness"] == 0.0, "Expected average cleanliness rating to be 0.0"
    assert average_ratings["total"] == 0.0, "Expected average total rating to be 0.0"

    # Check total ratings
    assert rating_metrics["totalRatings"] == 0, "Expected totalRatings to be 0"

    # Check ratings by spot
    ratings_by_spot = rating_metrics.get("ratingsBySpot", [])
    assert len(ratings_by_spot) == 1, "Expected one spot in ratingsBySpot"
    spot_ratings = ratings_by_spot[0]
    assert spot_ratings["ratingCount"] == 0, "Expected ratingCount to be 0"
    assert spot_ratings["ratingDistribution"] == [], "Expected ratingDistribution to be empty"
    assert spot_ratings["recentReviews"] == [], "Expected recentReviews to be empty"

    # Insert a reservation directly into the past
    car_id = create_test_car(client, token=renter_token)
    past_start_time = datetime.now(timezone.utc) - timedelta(days=10)
    past_end_time = past_start_time + timedelta(hours=2)
    insert_reservation_directly(
        renter_id=renter_id,
        space_id=spot_id,
        car_id=car_id,
        start_time=past_start_time,
        end_time=past_end_time
    )

    # Submit a single rating via the API
    rating_payload = {
        "availability_rating": 5,
        "cleanliness_rating": 4
    }
    response = client.post(
        f"/api/unstable/parking-spaces/{spot_id}/rate",
        headers={"Authorization": f"Bearer {renter_token}"},
        json=rating_payload
    )
    assert response.status_code == 200, "Failed to submit rating"

    # Fetch analytics again
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, f"Failed to get analytics data after rating: {response.get_json()}"
    data = response.get_json()
    assert data is not None

    # Validate 'ratingMetrics' after one rating
    rating_metrics = data.get("ratingMetrics", {})
    assert rating_metrics, "ratingMetrics should be present after one rating"

    # Check average ratings
    average_ratings = rating_metrics.get("averageRatings", {})
    assert average_ratings["availability"] == 5.0, "Expected average availability rating to be 5.0"
    assert average_ratings["cleanliness"] == 4.0, "Expected average cleanliness rating to be 4.0"
    assert average_ratings["total"] == 4.5, "Expected average total rating to be 4.5"

    # Check total ratings
    assert rating_metrics["totalRatings"] == 1, "Expected totalRatings to be 1"

    # Check ratings by spot
    ratings_by_spot = rating_metrics.get("ratingsBySpot", [])
    assert len(ratings_by_spot) == 1, "Expected one spot in ratingsBySpot after one rating"
    spot_ratings = ratings_by_spot[0]
    assert spot_ratings["ratingCount"] == 1, "Expected ratingCount to be 1"

    # Check rating distribution
    expected_distribution = [{'stars': 4, 'count': 1, 'percentage': 100.0}]
    assert spot_ratings["ratingDistribution"] == expected_distribution, "Expected correct ratingDistribution"

    assert len(spot_ratings["recentReviews"]) == 1, "Expected one recent review"

def test_analytics_multiple_ratings_different_users(client: FlaskClient) -> None:
    """Test analytics when multiple ratings are submitted by different users."""
    # Create an owner and multiple renters
    owner_email = f"owner_multiple_users_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    num_raters = 5
    renter_tokens = []
    renter_ids = []
    ratings = [
        {"availability_rating": 3, "cleanliness_rating": 2},
        {"availability_rating": 4, "cleanliness_rating": 5},
        {"availability_rating": 5, "cleanliness_rating": 4},
        {"availability_rating": 2, "cleanliness_rating": 3},
        {"availability_rating": 3, "cleanliness_rating": 4},
    ]

    for i in range(num_raters):
        renter_email = f"renter_multiple_users_{i}@example.com"
        token = create_test_user(client, email=renter_email)
        renter_tokens.append(token)
        renter_id = get_user_id_from_token(client, token)
        renter_ids.append(renter_id)

    # Create a paid parking space
    spot_id = create_test_parking_space(client, token=owner_token, is_paid=True)

    # Create cars and insert reservations with ratings
    for i in range(num_raters):
        car_id = create_test_car(client, token=renter_tokens[i])
        past_start_time = datetime.now(timezone.utc) - timedelta(days=i + 3)
        past_end_time = past_start_time + timedelta(hours=2)
        insert_reservation_directly(
            renter_id=renter_ids[i],
            space_id=spot_id,
            car_id=car_id,
            start_time=past_start_time,
            end_time=past_end_time
        )

        # Submit a rating via the API
        rating_payload = ratings[i]
        response = client.post(
            f"/api/unstable/parking-spaces/{spot_id}/rate",
            headers={"Authorization": f"Bearer {renter_tokens[i]}"},
            json=rating_payload
        )
        assert response.status_code == 200, f"Failed to submit rating for renter {i}"

    # Fetch analytics
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, "Failed to get analytics data"
    data = response.get_json()
    assert data is not None

    # Validate 'ratingMetrics'
    rating_metrics = data.get("ratingMetrics", {})
    assert rating_metrics, "ratingMetrics should be present"

    # Calculate expected averages
    total_availability = sum(r["availability_rating"] for r in ratings)
    total_cleanliness = sum(r["cleanliness_rating"] for r in ratings)
    total_total = sum((r["availability_rating"] + r["cleanliness_rating"]) / 2 for r in ratings)

    expected_avg_availability = round(total_availability / num_raters, 2)
    expected_avg_cleanliness = round(total_cleanliness / num_raters, 2)
    expected_avg_total = round(total_total / num_raters, 2)

    # Check average ratings
    average_ratings = rating_metrics.get("averageRatings", {})
    assert average_ratings["availability"] == expected_avg_availability, \
        f"Expected average availability rating to be {expected_avg_availability}"
    assert average_ratings["cleanliness"] == expected_avg_cleanliness, \
        f"Expected average cleanliness rating to be {expected_avg_cleanliness}"
    assert average_ratings["total"] == expected_avg_total, \
        f"Expected average total rating to be {expected_avg_total}"

    # Check total ratings
    assert rating_metrics["totalRatings"] == num_raters, f"Expected totalRatings to be {num_raters}"

    # Check ratings by spot
    ratings_by_spot = rating_metrics.get("ratingsBySpot", [])
    assert len(ratings_by_spot) == 1, "Expected one spot in ratingsBySpot"
    spot_ratings = ratings_by_spot[0]
    assert spot_ratings["ratingCount"] == num_raters, f"Expected ratingCount to be {num_raters}"

    expected_distribution: Dict[int, int] = {}
    for r in ratings:
        total_rating = (r["availability_rating"] + r["cleanliness_rating"]) / 2
        stars = int(total_rating)
        expected_distribution[stars] = expected_distribution.get(stars, 0) + 1

    # Calculate percentage
    expected_distribution_with_percentages = []
    for stars, count in sorted(expected_distribution.items()):
        percentage = round((count / num_raters) * 100, 2)
        expected_distribution_with_percentages.append({
            "stars": stars,
            "count": count,
            "percentage": percentage
        })

    actual_distribution = spot_ratings.get("ratingDistribution", [])
    assert len(actual_distribution) == len(expected_distribution_with_percentages), \
        "Rating distribution length mismatch"

    for expected in expected_distribution_with_percentages:
        matching = next((item for item in actual_distribution if item["stars"] == expected["stars"]), None)
        assert matching is not None, f"Stars {expected['stars']} not found in actual distribution"
        assert matching["count"] == expected["count"], f"Count mismatch for stars {expected['stars']}"
        assert matching["percentage"] == expected["percentage"], f"Percentage mismatch for stars {expected['stars']}"

    assert len(spot_ratings["recentReviews"]) == 5, "Expected 5 recent reviews as this is the max"

def test_analytics_rating_distribution_accuracy(client: FlaskClient) -> None:
    """Test that the rating distribution is accurately calculated."""
    # Create an owner and multiple renters
    owner_email = f"owner_distribution_accuracy_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    num_raters = 10
    renter_tokens = []
    renter_ids = []
    ratings = [
        {"availability_rating": 5, "cleanliness_rating": 5},
        {"availability_rating": 4, "cleanliness_rating": 4},
        {"availability_rating": 3, "cleanliness_rating": 3},
        {"availability_rating": 2, "cleanliness_rating": 2},
        {"availability_rating": 1, "cleanliness_rating": 1},
        {"availability_rating": 5, "cleanliness_rating": 4},
        {"availability_rating": 4, "cleanliness_rating": 5},
        {"availability_rating": 3, "cleanliness_rating": 4},
        {"availability_rating": 2, "cleanliness_rating": 3},
        {"availability_rating": 1, "cleanliness_rating": 2},
    ]

    for i in range(num_raters):
        renter_email = f"renter_distribution_accuracy_{i}@example.com"
        token = create_test_user(client, email=renter_email)
        renter_tokens.append(token)
        renter_id = get_user_id_from_token(client, token)
        renter_ids.append(renter_id)

    # Create a paid parking space
    spot_id = create_test_parking_space(client, token=owner_token, is_paid=True)

    # Create cars and insert reservations with ratings
    for i in range(num_raters):
        car_id = create_test_car(client, token=renter_tokens[i])
        past_start_time = datetime.now(timezone.utc) - timedelta(days=i + 5)
        past_end_time = past_start_time + timedelta(hours=2)
        insert_reservation_directly(
            renter_id=renter_ids[i],
            space_id=spot_id,
            car_id=car_id,
            start_time=past_start_time,
            end_time=past_end_time
        )

        # Submit a rating via the API
        rating_payload = ratings[i]
        response = client.post(
            f"/api/unstable/parking-spaces/{spot_id}/rate",
            headers={"Authorization": f"Bearer {renter_tokens[i]}"},
            json=rating_payload
        )
        assert response.status_code == 200, f"Failed to submit rating for renter {i}"

    # Fetch analytics
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, "Failed to get analytics data"
    data = response.get_json()
    assert data is not None

    # Validate 'ratingMetrics'
    rating_metrics = data.get("ratingMetrics", {})
    assert rating_metrics, "ratingMetrics should be present"

    # Calculate expected averages
    total_availability = sum(r["availability_rating"] for r in ratings)
    total_cleanliness = sum(r["cleanliness_rating"] for r in ratings)
    total_total = sum((r["availability_rating"] + r["cleanliness_rating"]) / 2 for r in ratings)

    expected_avg_availability = round(total_availability / num_raters, 2)
    expected_avg_cleanliness = round(total_cleanliness / num_raters, 2)
    expected_avg_total = round(total_total / num_raters, 2)

    # Check average ratings
    average_ratings = rating_metrics.get("averageRatings", {})
    assert average_ratings["availability"] == expected_avg_availability, \
        f"Expected average availability rating to be {expected_avg_availability}"
    assert average_ratings["cleanliness"] == expected_avg_cleanliness, \
        f"Expected average cleanliness rating to be {expected_avg_cleanliness}"
    assert average_ratings["total"] == expected_avg_total, \
        f"Expected average total rating to be {expected_avg_total}"

    # Check total ratings
    assert rating_metrics["totalRatings"] == num_raters, f"Expected totalRatings to be {num_raters}"

    # Check ratings by spot
    ratings_by_spot = rating_metrics.get("ratingsBySpot", [])
    assert len(ratings_by_spot) == 1, "Expected one spot in ratingsBySpot"
    spot_ratings = ratings_by_spot[0]
    assert spot_ratings["ratingCount"] == num_raters, f"Expected ratingCount to be {num_raters}"

    # Check rating distribution
    expected_distribution: Dict[int, int] = {}
    for r in ratings:
        total_rating = (r["availability_rating"] + r["cleanliness_rating"]) / 2
        stars = int(total_rating)
        expected_distribution[stars] = expected_distribution.get(stars, 0) + 1

    # Prepare expected distribution with percentages
    expected_distribution_with_percentages = []
    for stars, count in sorted(expected_distribution.items()):
        percentage = round((count / num_raters) * 100, 2)
        expected_distribution_with_percentages.append({
            "stars": stars,
            "count": count,
            "percentage": percentage
        })

    actual_distribution = spot_ratings.get("ratingDistribution", [])
    assert len(actual_distribution) == len(expected_distribution_with_percentages), \
        "Rating distribution length mismatch"

    for expected in expected_distribution_with_percentages:
        matching = next((item for item in actual_distribution if item["stars"] == expected["stars"]), None)
        assert matching is not None, f"Stars {expected['stars']} not found in actual distribution"
        assert matching["count"] == expected["count"], f"Count mismatch for stars {expected['stars']}"
        assert matching["percentage"] == expected["percentage"], f"Percentage mismatch for stars {expected['stars']}"

    assert len(spot_ratings["recentReviews"]) == 5, "Expected 5 recent reviews as this is the max"
