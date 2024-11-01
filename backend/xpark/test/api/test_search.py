from flask.testing import FlaskClient
import json
from typing import Dict, cast
from datetime import datetime, timedelta, timezone
from xpark.utils.db import DB
from psycopg.rows import dict_row


def test_search_parking_spaces(client: FlaskClient) -> None:
    # Register a user and retrieve the token (if necessary)
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "searchuser@example.com",
            "full_name": "Search User",
            "password": "SearchPass123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]

    # Define search parameters
    search_params = {
        "latitude": 40.4297,
        "longitude": -86.9289,
        "radius": 5,  # in kilometers
        "paid_status": "UNPAID",
        "min_price": 0,
        "max_price": 5,
        "start_time": "08:00",
        "end_time": "20:00",
        "is_taken": False,
    }

    # Perform the search
    response = client.post(
        "/api/unstable/search",
        headers={"Authorization": f"Bearer {token}"},
        json=search_params,
    )
    assert response.status_code == 200, f"Failed to search parking spaces: {response.json}"
    assert response.json is not None
    search_results = response.json

    # Check the returned parking spaces meet the criteria

    for parking_space in search_results:
        # Check that each returned space meets the 'UNPAID' criteria
        assert not parking_space["is_paid"], f"Expected unpaid spaces, but found a paid space: {parking_space}"
        # Check the price range
        assert search_params["min_price"] <= parking_space["pricing_info"]["base_price"] <= search_params["max_price"], \
            f"Price out of range for space: {parking_space}"
        # Check location data is structured correctly
        assert "latitude" in parking_space["location"], "Missing latitude in location data"
        assert "longitude" in parking_space["location"], "Missing longitude in location data"
        assert "address" in parking_space["location"], "Missing address in location data"
        # Verify is_taken status if specified
        if search_params["is_taken"] is not None:
            assert parking_space["is_taken"] == search_params["is_taken"], \
                f"Expected is_taken to be {search_params['is_taken']} but found {parking_space['is_taken']}"


def test_search_parking_spaces_with_elapsed_time(client: FlaskClient) -> None:
    # Register a user and retrieve the token
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "elapseduser@example.com",
            "full_name": "Elapsed Time Tester",
            "password": "ElapsedPass123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]

    # Create a taken parking spot
    response = client.post(
        "/api/unstable/parking-spaces",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "data": json.dumps({
                "location": {
                    "latitude": 40.4297,
                    "longitude": -86.9289,
                    "address": "Elapsed Spot Address",
                },
                "is_paid": False,
                "is_taken": True,  # Mark as taken for testing elapsed time
            })
        },
    )
    assert response.status_code == 201, f"Failed to create parking spot: {response.json}"
    assert response.json
    spot_id = response.json["id"]

    # Set the `updated_at` timestamp directly in the database for testing purposes
    past_time = datetime.now(timezone.utc) - timedelta(hours=2, minutes=30)
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "UPDATE parking_spaces SET updated_at = %s, is_taken = TRUE WHERE id = %s",
                (past_time, spot_id),
            )
            conn.commit()

    # Retrieve the spot directly from the database to verify the update
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, is_taken, updated_at FROM parking_spaces WHERE id = %s", (spot_id,))
            db_spot = cur.fetchone()
            assert db_spot is not None, "Parking spot not found in database"
            assert db_spot["is_taken"] is True, f"Expected is_taken=True, got {db_spot['is_taken']}"
            assert db_spot["updated_at"] == past_time, f"Expected updated_at={past_time}, got {db_spot['updated_at']}"

    # Perform a search that includes taken spots
    search_params = {
        "latitude": 40.4297,
        "longitude": -86.9289,
        "radius": 5,
        "is_taken": True,
    }
    response = client.post(
        "/api/unstable/search",
        headers={"Authorization": f"Bearer {token}"},
        json=search_params,
    )
    assert response.status_code == 200, f"Failed to search parking spaces: {response.json}"
    assert response.json is not None
    search_results = response.json

    # Filter the results to ensure we find only the spot with is_taken = True
    taken_spot = next((space for space in search_results if space["id"] == spot_id and space["is_taken"] is True), None)
    assert taken_spot, "Test taken parking spot not found in search results"

    # Calculate expected elapsed time and compare with the `name` field for the taken spot
    expected_name = "Updated 2 hours ago"
    assert taken_spot["name"] == expected_name, f"Expected '{expected_name}', but got '{taken_spot['name']}'"

    # Clean up by deleting the parking spot
    response = client.delete(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200