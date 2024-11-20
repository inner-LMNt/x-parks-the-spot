import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from flask.testing import FlaskClient

# Import utility functions
from xpark.test.utils.utils import (
    create_test_user,
    create_test_parking_space,
    create_test_car,
    create_test_reservation_at_time,
    get_user_id_from_token,
    insert_reservation_directly,
    mark_reservations_completed, generate_varied_reservation_pattern, submit_test_ratings, setup_analytics_scenario,
)


def test_basic_analytics_response_structure(client: FlaskClient) -> None:
    """Test that the analytics endpoint returns the expected data structure."""
    # Create test scenario with fewer reservations to better track what's happening
    owner_token, renter_token, scenario_data = setup_analytics_scenario(
        client,
        num_spots=2,  # Keep 2 spots for testing variety
        reservations_per_spot=3,
        days_of_history=30
    )
    spot_id = str(scenario_data["spot_ids"][0])

    # Create multiple renter accounts for ratings
    test_ratings = [(5, 4), (4, 5), (3, 4)]
    for i, (availability, cleanliness) in enumerate(test_ratings):
        rater_token = create_test_user(client, email=f"rater_{i}_{uuid.uuid4().hex}@example.com")
        response = client.post(
            f"/api/unstable/parking-spaces/{spot_id}/rate",
            headers={"Authorization": f"Bearer {rater_token}"},
            json={
                "availability_rating": availability,
                "cleanliness_rating": cleanliness,
            },
        )
        assert response.status_code == 200

    # Get analytics data
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    # 1. Validate Overall Structure
    expected_top_level_keys = {
        "overallMetrics", "revenueMetrics", "bookingMetrics",
        "spotPerformance", "upcomingEarnings", "ratingMetrics"
    }
    assert set(data.keys()) == expected_top_level_keys

    # 2. Validate overallMetrics
    overall = data["overallMetrics"]
    assert set(overall.keys()) == {"revenue", "occupancy", "bookings"}
    assert set(overall["revenue"].keys()) == {"total", "perBooking"}
    assert set(overall["bookings"].keys()) == {"active", "percentageActive", "total"}
    assert isinstance(overall["occupancy"]["overallRate"], (str, float))

    # 3. Validate bookingMetrics
    booking_metrics = data["bookingMetrics"]
    assert set(booking_metrics.keys()) == {"stats", "recentBookings"}

    # Check stats fields
    stats = booking_metrics["stats"]
    expected_stat_fields = {
        "active", "avgDuration", "canceled", "completed",
        "completionRate", "total"
    }
    assert set(stats.keys()) == expected_stat_fields

    # Check recentBookings structure
    if booking_metrics["recentBookings"]:  # If there are any bookings
        booking = booking_metrics["recentBookings"][0]
        expected_booking_fields = {
            "carDetails", "duration", "endTime", "id", "price",
            "renterName", "spotId", "spotName", "startTime",
            "status", "time_status"
        }
        assert set(booking.keys()) == expected_booking_fields
        assert set(booking["carDetails"].keys()) == {"color", "make", "model", "plate", "state"}

    # 4. Validate revenueMetrics
    revenue_metrics = data["revenueMetrics"]
    assert set(revenue_metrics.keys()) == {"historicalRevenue", "upcomingRevenue"}

    # Check historicalRevenue structure
    for entry in revenue_metrics["historicalRevenue"]:
        assert set(entry.keys()) == {"actual", "timestamp"}
        assert isinstance(entry["actual"], (int, float))
        assert isinstance(entry["timestamp"], str)

    # Check upcomingRevenue structure
    for entry in revenue_metrics["upcomingRevenue"]:
        assert set(entry.keys()) == {"potential", "timestamp"}
        assert isinstance(entry["potential"], (int, float))
        assert isinstance(entry["timestamp"], str)

    # 5. Validate spotPerformance
    for spot_id, performance in data["spotPerformance"].items():
        expected_performance_fields = {
            "activeBookings", "averageBookingLength", "canceledBookings",
            "completedBookings", "occupancyRate", "popularDays",
            "popularHours", "totalBookings", "totalRevenue"
        }
        assert set(performance.keys()) == expected_performance_fields

        # Check popularHours structure
        for hour in performance["popularHours"]:
            assert set(hour.keys()) == {"hour", "bookings"}
            assert 0 <= hour["hour"] <= 23

        # Check popularDays structure
        for day in performance["popularDays"]:
            assert set(day.keys()) == {"day", "bookings"}
            assert day["day"] in {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}

    # 6. Validate upcomingEarnings
    upcoming = data["upcomingEarnings"]
    assert set(upcoming.keys()) == {"reservations", "total"}
    if upcoming["reservations"]:
        reservation = upcoming["reservations"][0]
        assert set(reservation.keys()) == {"spotName", "startTime", "endTime", "earnings"}

    # 7. Validate ratingMetrics
    rating_metrics = data["ratingMetrics"]
    assert set(rating_metrics.keys()) == {"averageRatings", "totalRatings", "ratingsBySpot"}

    # Check averageRatings structure
    assert set(rating_metrics["averageRatings"].keys()) == {"availability", "cleanliness", "total"}

    # Check ratingsBySpot structure
    if rating_metrics["ratingsBySpot"]:
        spot_rating = rating_metrics["ratingsBySpot"][0]
        expected_spot_rating_fields = {
            "availabilityRating", "cleanlinessRating", "ratingCount",
            "ratingDistribution", "recentReviews", "spotId", "spotName",
            "totalRating"
        }
        assert set(spot_rating.keys()) == expected_spot_rating_fields

        # Check rating distribution structure
        if spot_rating["ratingDistribution"]:
            distribution = spot_rating["ratingDistribution"][0]
            assert set(distribution.keys()) == {"count", "percentage", "stars"}

        # Check recent reviews structure
        if spot_rating["recentReviews"]:
            review = spot_rating["recentReviews"][0]
            assert set(review.keys()) == {"rating", "daysAgo", "isVerified"}


def test_analytics_with_reservations(client: FlaskClient) -> None:
    """Test analytics data with varied reservation patterns."""
    owner_token, renter_token, scenario_data = setup_analytics_scenario(
        client,
        num_spots=1,
        reservations_per_spot=5,
        days_of_history=30
    )
    space_id = scenario_data["spot_ids"][0]

    # Add reservations
    base_time = datetime.now(timezone.utc) - timedelta(days=21)
    weekend_reservations = generate_varied_reservation_pattern(
        client,
        renter_token,
        space_id,
        "weekend_heavy",
        base_time,
        5
    )

    peak_base_time = datetime.now(timezone.utc) - timedelta(days=7)
    peak_reservations = generate_varied_reservation_pattern(
        client,
        renter_token,
        space_id,
        "peak_hours",
        peak_base_time,
        5
    )

    # Submit ratings from different users
    test_ratings = [(5, 4), (4, 5), (3, 4), (4, 3), (5, 5)]

    for i, (availability, cleanliness) in enumerate(test_ratings):
        # Create a new renter for each rating
        renter_email = f"rater_{i}_{uuid.uuid4().hex}@example.com"
        rater_token = create_test_user(client, email=renter_email)

        response = client.post(
            f"/api/unstable/parking-spaces/{space_id}/rate",
            headers={"Authorization": f"Bearer {rater_token}"},
            json={
                "availability_rating": availability,
                "cleanliness_rating": cleanliness,
            },
        )
        assert response.status_code == 200
        rating_data = response.get_json()
        print(f"Created rating from {renter_email}: {rating_data}")

    # Get analytics data
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()

    # Print debug info
    spot_data = data["spotPerformance"][str(space_id)]
    rating_metrics = data["ratingMetrics"]
    print(f"\nRating metrics: {rating_metrics}")

    # Validate ratings
    assert rating_metrics["totalRatings"] == len(test_ratings), \
        f"Expected {len(test_ratings)} ratings, got {rating_metrics['totalRatings']}"

    # Validate booking volumes
    initial_bookings = 5
    weekend_count = len(weekend_reservations)
    peak_count = len(peak_reservations)
    total_expected = initial_bookings + weekend_count + peak_count

    assert spot_data["totalBookings"] == total_expected, \
        f"Mismatch in bookings. Got {spot_data['totalBookings']}, " \
        f"Expected: {total_expected}"

    # Time pattern validation remains the same...
    peak_hours = sorted(hour["hour"] for hour in spot_data["popularHours"])
    popular_days = [day["day"] for day in spot_data["popularDays"]]

    assert any(9 <= hour <= 17 for hour in peak_hours), \
        f"No business hours ({peak_hours}) found in peak hours"
    assert any(day in ["Saturday", "Sunday"] for day in popular_days), \
        f"No weekend days found in {popular_days}"

def test_analytics_with_no_data(client: FlaskClient) -> None:
    """Test that the analytics endpoint returns zeros/empty values with no data."""
    owner_token = create_test_user(client, email=f"owner_{uuid.uuid4().hex}@example.com")
    space_id = create_test_parking_space(client, token=owner_token)

    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    # Validate zero metrics
    overall = data["overallMetrics"]
    assert overall["revenue"]["total"] == 0
    assert overall["revenue"]["perBooking"] == 0
    assert overall["occupancy"]["overallRate"] == 0
    assert overall["bookings"]["total"] == 0
    assert overall["bookings"]["active"] == 0
    assert overall["bookings"]["percentageActive"] == 0

    # Validate empty booking metrics
    booking_stats = data["bookingMetrics"]["stats"]
    expected_zero_stats = [
        "total", "active", "completed", "canceled",
        "avgDuration", "completionRate"
    ]
    for stat in expected_zero_stats:
        assert booking_stats[stat] == 0, f"Expected {stat} to be 0"

    assert len(data["bookingMetrics"]["recentBookings"]) == 0

    # Validate spot performance
    spot_data = data["spotPerformance"][str(space_id)]
    assert spot_data["totalBookings"] == 0
    assert spot_data["totalRevenue"] == 0
    assert spot_data["occupancyRate"] == 0
    assert len(spot_data["popularHours"]) == 0
    assert len(spot_data["popularDays"]) == 0

    # Validate rating metrics
    rating_metrics = data["ratingMetrics"]
    assert rating_metrics["totalRatings"] == 0
    assert rating_metrics["averageRatings"]["total"] == 0

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
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    # Check that the spotPerformance contains the parking space
    spot_performance = data.get("spotPerformance", {})
    assert isinstance(spot_performance, dict), "spotPerformance should be a dictionary"
    assert len(spot_performance) == 1, "Expected one parking space in spotPerformance"
    assert (
        space_id in spot_performance
    ), f"Space ID {space_id} not found in spotPerformance"

    # Validate the contents of the parking space data
    spot_data = spot_performance[space_id]
    expected_keys = [
        "totalRevenue",
        "totalBookings",
        "occupancyRate",
        "averageBookingLength",
        "activeBookings",
        "completedBookings",
        "canceledBookings",
        "popularHours",
        "popularDays",
    ]
    for key in expected_keys:
        assert key in spot_data, f"Key '{key}' not found in spot data"
    assert spot_data["totalRevenue"] == 0, "Expected totalRevenue to be 0"
    assert spot_data["totalBookings"] == 0, "Expected totalBookings to be 0"
    assert spot_data["occupancyRate"] == 0, "Expected occupancyRate to be 0"
    assert (
        spot_data["averageBookingLength"] == 0
    ), "Expected averageBookingLength to be 0"
    assert spot_data["activeBookings"] == 0, "Expected activeBookings to be 0"
    assert spot_data["completedBookings"] == 0, "Expected completedBookings to be 0"
    assert spot_data["canceledBookings"] == 0, "Expected canceledBookings to be 0"
    assert spot_data["popularHours"] == [], "Expected popularHours to be empty"
    assert spot_data["popularDays"] == [], "Expected popularDays to be empty"


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
            end_time=end_time,
        )
        reservation_dates.append(start_time)

    now = datetime.now(timezone.utc)

    # Calculate expected bookings based on actual dates
    expected_bookings_7_days = sum(
        1 for date in reservation_dates if (now - date).days < 7
    )
    expected_bookings_30_days = sum(
        1 for date in reservation_dates if (now - date).days < 30
    )
    expected_bookings_1_year = num_reservations

    # Test with '7_days' filter
    response = client.get(
        "/api/unstable/analytics/dashboard",
        query_string={"time_filter": "7_days"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert (
        response.status_code == 200
    ), f"Failed with status {response.status_code}: {response.get_json()}"
    data_7_days = response.get_json()
    total_bookings_7_days = (
        data_7_days.get("overallMetrics", {}).get("bookings", {}).get("total", 0)
    )

    # Test with '30_days' filter
    response = client.get(
        "/api/unstable/analytics/dashboard",
        query_string={"time_filter": "30_days"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert (
        response.status_code == 200
    ), f"Failed with status {response.status_code}: {response.get_json()}"
    data_30_days = response.get_json()
    total_bookings_30_days = (
        data_30_days.get("overallMetrics", {}).get("bookings", {}).get("total", 0)
    )

    # Test with '1_year' filter
    response = client.get(
        "/api/unstable/analytics/dashboard",
        query_string={"time_filter": "1_year"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert (
        response.status_code == 200
    ), f"Failed with status {response.status_code}: {response.get_json()}"
    data_1_year = response.get_json()
    total_bookings_1_year = (
        data_1_year.get("overallMetrics", {}).get("bookings", {}).get("total", 0)
    )

    # Check that the number of bookings increases with longer time filters
    assert (
        total_bookings_7_days <= total_bookings_30_days <= total_bookings_1_year
    ), "Bookings should increase with longer time filters"

    # Use calculated expected bookings in assertions
    assert (
        total_bookings_7_days == expected_bookings_7_days
    ), f"Expected {expected_bookings_7_days} bookings for 7_days, got {total_bookings_7_days}"
    assert (
        total_bookings_30_days == expected_bookings_30_days
    ), f"Expected {expected_bookings_30_days} bookings for 30_days, got {total_bookings_30_days}"
    assert (
        total_bookings_1_year == expected_bookings_1_year
    ), f"Expected {expected_bookings_1_year} bookings for 1_year, got {total_bookings_1_year}"


def test_analytics_with_invalid_time_filter(client: FlaskClient) -> None:
    """Test that the analytics endpoint returns an error with an invalid time filter."""
    # Create an owner user
    owner_email = f"owner_{uuid.uuid4().hex}@example.com"
    owner_token = create_test_user(client, email=owner_email)

    # Make a GET request with an invalid time_filter
    response = client.get(
        "/api/unstable/analytics/dashboard?time_filter=invalid_filter",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    # Expecting a 400 Bad Request
    assert (
        response.status_code == 400
    ), f"Expected status code 400, got {response.status_code}"
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
        car_id=car_id,
    )
    create_test_reservation_at_time(
        client,
        token=renter_token,
        space_id=space_id_2,
        start_time=start_time,
        end_time=end_time,
        car_id=car_id,
    )

    # Get analytics for space_id_1
    response = client.get(
        f"/api/unstable/analytics/dashboard?spot_id={space_id_1}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data_space_1 = response.get_json()
    spot_performance_1 = data_space_1.get("spotPerformance", {})
    assert (
        space_id_1 in spot_performance_1
    ), f"Space ID {space_id_1} should be in spotPerformance"
    assert (
        space_id_2 not in spot_performance_1
    ), f"Space ID {space_id_2} should not be in spotPerformance"

    # Get analytics for space_id_2
    response = client.get(
        f"/api/unstable/analytics/dashboard?spot_id={space_id_2}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data_space_2 = response.get_json()
    spot_performance_2 = data_space_2.get("spotPerformance", {})
    assert (
        space_id_2 in spot_performance_2
    ), f"Space ID {space_id_2} should be in spotPerformance"
    assert (
        space_id_1 not in spot_performance_2
    ), f"Space ID {space_id_1} should not be in spotPerformance"


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
        start_time = datetime.now(timezone.utc) + timedelta(days=i + 1)
        end_time = start_time + timedelta(hours=2)
        create_test_reservation_at_time(
            client,
            token=renter_token,
            space_id=space_id,
            start_time=start_time,
            end_time=end_time,
            car_id=car_id,
        )

    # Make a GET request to the analytics endpoint
    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None

    upcoming_earnings = data.get("upcomingEarnings", {})
    total_upcoming = upcoming_earnings.get("total", 0)
    reservations = upcoming_earnings.get("reservations", [])

    assert total_upcoming > 0, "Expected total upcoming earnings to be greater than 0"
    assert (
        len(reservations) == num_reservations
    ), f"Expected {num_reservations} upcoming reservations"


def test_analytics_with_no_auth(client: FlaskClient) -> None:
    """Test that the analytics endpoint returns 403 when no authorization is provided."""
    response = client.get("/api/unstable/analytics/dashboard")
    assert (
        response.status_code == 403
    ), f"Expected status code 403, got {response.status_code}"
    data = response.get_json()
    assert "err" in data, "Expected error message in response"


def test_analytics_response_strict(client: FlaskClient) -> None:
    """Test analytics response including all metrics with exact values."""
    owner_token, renter_token, scenario_data = setup_analytics_scenario(
        client,
        num_spots=3,
        reservations_per_spot=5,
        days_of_history=30
    )
    spot_ids = scenario_data["spot_ids"] # type: List[str]
    renter_id = get_user_id_from_token(client, renter_token)
    car_id = create_test_car(client, renter_token)

    # Add some upcoming reservations
    now = datetime.now(timezone.utc)
    upcoming_reservations = [
        # 3 days from now, Spot 1 ($10/hr * 4 hours = $40)
        {
            "spot_id": spot_ids[0],
            "start_time": now + timedelta(days=3),
            "duration": timedelta(hours=4),
            "expected_price": 40.0
        },
        # 6 days from now, Spot 2 ($20/hr * 3 hours = $60)
        {
            "spot_id": spot_ids[1],
            "start_time": now + timedelta(days=6),
            "duration": timedelta(hours=3),
            "expected_price": 60.0
        },
        # 10 days from now, Spot 3 ($30/hr * 5 hours = $150) - should not be included in upcoming
        {
            "spot_id": spot_ids[2],
            "start_time": now + timedelta(days=10),
            "duration": timedelta(hours=5),
            "expected_price": 150.0
        }
    ]

    # Insert the upcoming reservations
    for res in upcoming_reservations:
        insert_reservation_directly(
            renter_id=renter_id,
            space_id=res["spot_id"],
            car_id=car_id,
            start_time=res["start_time"],
            end_time=res["start_time"] + res["duration"]
        )

    # Add ratings from different users
    test_ratings = [(5, 4), (4, 5), (3, 4)]
    for i, (availability, cleanliness) in enumerate(test_ratings):
        rater_token = create_test_user(client, email=f"rater_{i}_{uuid.uuid4().hex}@example.com")
        response = client.post(
            f"/api/unstable/parking-spaces/{spot_ids[0]}/rate",
            headers={"Authorization": f"Bearer {rater_token}"},
            json={
                "availability_rating": availability,
                "cleanliness_rating": cleanliness,
            },
        )
        assert response.status_code == 200

    response = client.get(
        "/api/unstable/analytics/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    print("\nFull response data:", json.dumps(data, indent=2))

    # 1. Overall Metrics
    overall = data["overallMetrics"]

    # Revenue validation
    revenue = overall["revenue"]
    assert round(revenue["total"], 1) == 840.0
    assert round(revenue["perBooking"], 1) == 56.0

    # Bookings validation
    bookings = overall["bookings"]
    assert bookings["total"] == 17
    assert bookings["active"] == 0
    assert round(bookings["percentageActive"], 1) == 0.0

    # Occupancy validation
    assert round(float(overall["occupancy"]["overallRate"]), 10) == 1.9444444444

    # 2. Booking Metrics
    booking_metrics = data["bookingMetrics"]
    stats = booking_metrics["stats"]

    assert stats["total"] == 17
    assert stats["active"] == 0
    assert round(stats["avgDuration"], 1) == 2.9
    assert stats["canceled"] == 0
    assert stats["completed"] == 15
    assert round(stats["completionRate"], 1) == 100.0

    # Check recent bookings structure and values
    recent = booking_metrics["recentBookings"]
    assert len(recent) == 17
    first_booking = recent[0]
    assert first_booking["duration"] == 3.0
    assert first_booking["price"] == 60.0
    assert first_booking["status"] == "completed"
    assert first_booking["time_status"] == "upcoming"

    # 3. Revenue Metrics
    revenue_metrics = data["revenueMetrics"]

    # Historical revenue validation
    historical = revenue_metrics["historicalRevenue"]
    assert len(historical) == 31

    # Check specific historical dates
    oct_21_entry = next(h for h in historical if h["timestamp"] == "2024-10-21T00:00:00+00:00")
    assert round(oct_21_entry["actual"], 1) == 120.0

    oct_27_entry = next(h for h in historical if h["timestamp"] == "2024-10-27T00:00:00+00:00")
    assert round(oct_27_entry["actual"], 1) == 180.0

    nov_2_entry = next(h for h in historical if h["timestamp"] == "2024-11-02T00:00:00+00:00")
    assert round(nov_2_entry["actual"], 1) == 240.0

    nov_8_entry = next(h for h in historical if h["timestamp"] == "2024-11-08T00:00:00+00:00")
    assert round(nov_8_entry["actual"], 1) == 120.0

    nov_14_entry = next(h for h in historical if h["timestamp"] == "2024-11-14T00:00:00+00:00")
    assert round(nov_14_entry["actual"], 1) == 180.0

    # 4. Spot Performance
    spot_performance = data["spotPerformance"]
    assert len(spot_performance) == 3

    # Check each spot's exact metrics
    for spot_id, perf in spot_performance.items():
        assert perf["totalBookings"] == 5
        assert round(perf["averageBookingLength"], 1) == 2.8
        assert perf["activeBookings"] == 0
        assert round(perf["occupancyRate"], 10) == 1.9444444444

        # All popular hours have exactly 5 bookings
        for hour_data in perf["popularHours"]:
            assert hour_data["bookings"] == 5

        # All popular days have exactly 1 booking
        for day_data in perf["popularDays"]:
            assert day_data["bookings"] == 1

    # Check specific spot revenues and completions
    spot_1 = next(sp for sp_id, sp in spot_performance.items() if sp["totalRevenue"] == 140.0)
    spot_2 = next(sp for sp_id, sp in spot_performance.items() if sp["totalRevenue"] == 280.0)
    spot_3 = next(sp for sp_id, sp in spot_performance.items() if sp["totalRevenue"] == 420.0)

    assert spot_1["completedBookings"] == 500
    assert spot_2["completedBookings"] == 450
    assert spot_3["completedBookings"] == 400

    # 5. Rating Metrics
    rating_metrics = data["ratingMetrics"]

    avg_ratings = rating_metrics["averageRatings"]
    assert round(avg_ratings["availability"], 1) == 4.0
    assert round(avg_ratings["cleanliness"], 6) == 4.333333
    assert round(avg_ratings["total"], 6) == 4.166667

    assert rating_metrics["totalRatings"] == 3

    # 6. Upcoming Earnings
    upcoming = data["upcomingEarnings"]
    assert len(upcoming["reservations"]) == 2  # Only within 7 days
    expected_total = 100.0  # $40 + $60
    assert round(upcoming["total"], 1) == expected_total

    # Check individual upcoming reservations
    reservations = sorted(upcoming["reservations"], key=lambda x: x["startTime"])

    # 3-day reservation
    assert round(reservations[0]["earnings"], 1) == 40.0
    assert reservations[0]["spotName"] == "Test Spot 1"
    start_time = datetime.fromisoformat(reservations[0]["startTime"])
    assert abs((start_time - (now + timedelta(days=3))).total_seconds()) < 60

    # 6-day reservation
    assert round(reservations[1]["earnings"], 1) == 60.0
    assert reservations[1]["spotName"] == "Test Spot 2"
    start_time = datetime.fromisoformat(reservations[1]["startTime"])
    assert abs((start_time - (now + timedelta(days=6))).total_seconds()) < 60

    # Validate upcoming revenue in revenue metrics
    upcoming_revenue = data["revenueMetrics"]["upcomingRevenue"]
    assert len(upcoming_revenue) == 169

    # Check specific upcoming hours
    day_3_hour = now + timedelta(days=3)
    day_3_hour = day_3_hour.replace(minute=0, second=0, microsecond=0)
    day_3_entry = next(u for u in upcoming_revenue if u["timestamp"] == day_3_hour.isoformat())
    assert round(day_3_entry["potential"], 1) == 40.0

    day_6_hour = now + timedelta(days=6)
    day_6_hour = day_6_hour.replace(minute=0, second=0, microsecond=0)
    day_6_entry = next(u for u in upcoming_revenue if u["timestamp"] == day_6_hour.isoformat())
    assert round(day_6_entry["potential"], 1) == 60.0

    # Verify day 10 reservation is not included
    day_10_hour = now + timedelta(days=10)
    day_10_hour = day_10_hour.replace(minute=0, second=0, microsecond=0)
    assert not any(
        u for u in upcoming_revenue
        if u["timestamp"] == day_10_hour.isoformat() and u["potential"] > 0
    )