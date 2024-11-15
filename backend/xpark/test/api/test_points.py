from flask.testing import FlaskClient
from uuid import uuid4
from ..utils.utils import create_test_user, create_test_parking_space
import json

def test_award_points_parked_success(client: FlaskClient) -> None:
    """Test awarding points for a 'parked' status and verify spot update."""
    # Create a test user and parking space
    user_token = create_test_user(client, email="user@example.com")
    owner_token = create_test_user(client, email="owner@example.com")
    parking_space_id = create_test_parking_space(client, owner_token)

    # Award points for the 'parked' status
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None, "Response JSON is None"
    assert "result" in data, "Missing 'result' in response JSON"
    assert data["result"] == "good"

    # Fetch points for the owner
    response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, "Failed to fetch user points"
    points_data = response.json
    assert points_data is not None, "Points response JSON is None"
    assert "points" in points_data, "Missing 'points' in response JSON"
    points = points_data["points"]
    assert points['current'] >= 0, "Current points are invalid"
    assert points['total'] >= 0, "Total points are invalid"


def test_award_points_self_reward(client: FlaskClient) -> None:
    """Test that points cannot be awarded if driver and spot finder are the same user."""
    user_token = create_test_user(client, email="selfuser@example.com")
    parking_space_id = create_test_parking_space(client, user_token)

    # Attempt to reward points for self
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None, "Response JSON is None"
    assert "result" in data, "Missing 'result' in response JSON"
    assert data["result"] == "good"

    # Verify no points are awarded
    response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200, "Failed to fetch user points"
    points_data = response.json
    assert points_data is not None, "Points response JSON is None"
    assert "points" in points_data, "Missing 'points' in response JSON"
    points = points_data["points"]
    assert points['current'] == 0, "Points were incorrectly awarded"
    assert points['total'] == 0, "Points were incorrectly awarded"



def test_award_points_taken_prompt(client: FlaskClient) -> None:
    """Test that the prompt updates the spot as 'taken' when driver selects 'Spot is already taken'."""
    owner_token = create_test_user(client, email="owner@example.com")
    parking_space_id = create_test_parking_space(client, owner_token)

    # Simulate marking the spot as taken
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {owner_token}"},
        data={"status": "taken"}
    )
    assert response.status_code == 200, "Failed to update spot as taken"
    data = response.get_json()
    assert data["result"] == "good"

    # Fetch the updated parking space
    response = client.get(
        f"/api/unstable/parking-spaces/{parking_space_id}",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert response.status_code == 200, "Failed to fetch updated parking space"
    updated_space = response.get_json()
    assert updated_space["is_taken"] is True, "Spot status was not updated to 'taken'"


def test_award_points_taken_success(client: FlaskClient) -> None:
    """Test updating a parking space as 'taken' without awarding points."""
    # Register a parking space owner and obtain the token
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "owner2@example.com",
            "full_name": "Test Owner",
            "password": "SecurePass123",
        },
    )
    assert response.status_code == 201
    assert response.json
    token = response.json["access_token"]

    # Create a parking space
    response = client.post(
        "/api/unstable/parking-spaces",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "data": json.dumps({
                "location": {
                    "latitude": 40.4237,
                    "longitude": -86.9249,
                    "address": "Another Test Address",
                },
                "is_paid": False,
            })
        },
    )
    assert response.status_code == 201
    assert response.json
    spot_id = response.json["id"]

    # Mark the parking space as 'taken'
    response = client.post(
        f"/api/unstable/parking-spaces/{spot_id}/award-points",
        headers={"Authorization": f"Bearer {token}"},
        data={"status": "taken"}
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["result"] == "good"

    # Verify that no points were awarded
    response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    points_data = response.json
    assert points_data
    assert points_data["points"]
    assert points_data["points"]['current'] == 0, "Points were incorrectly updated"
    assert points_data["points"]['total'] == 0,"Points were incorrectly updated"

    # Clean up by deleting the parking space
    response = client.delete(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, "Failed to delete the parking space"


def test_award_points_no_status(client: FlaskClient) -> None:
    """Test awarding points with missing 'status' parameter"""
    user_token = create_test_user(client, email="user@example.com")
    parking_space_id = create_test_parking_space(client, user_token)

    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["err"] == "Invalid status provided. Use 'taken' or 'parked'."

def test_award_points_authentication_required(client: FlaskClient) -> None:
    """Test that authentication is required for awarding points"""
    parking_space_id = uuid4()

    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        data={"status": "parked"}
    )
    assert response.status_code == 403

def test_award_points_invalid_parking_space(client: FlaskClient) -> None:
    """Test awarding points for a non-existent parking space"""
    user_token = create_test_user(client, email="user@example.com")
    invalid_parking_space_id = str(uuid4())

    response = client.post(
        f"/api/unstable/parking-spaces/{invalid_parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["err"] == "Parking space not found"

def test_award_points_restricted_no_update(client: FlaskClient) -> None:
    """Test awarding points restricted by time, ensuring no update occurs."""
    user_token = create_test_user(client, email="user@example.com")
    owner_token = create_test_user(client, email="owner@example.com")
    parking_space_id = create_test_parking_space(client, owner_token)

    # First award points
    first_response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"status": "parked"}
    )
    assert first_response.status_code == 200
    first_data = first_response.get_json()
    assert "result" in first_data and first_data["result"] == "good"

    # Fetch current points after the first award
    points_response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert points_response.status_code == 200
    points_data = points_response.get_json()
    initial_points = points_data["points"]

    # Attempt awarding points again within restricted time
    second_response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"status": "parked"}
    )
    assert second_response.status_code == 200  # No error returned, but points should not update
    second_data = second_response.get_json()
    assert "result" in second_data and second_data["result"] == "good"

    # Fetch points again after the second request
    updated_points_response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert updated_points_response.status_code == 200
    updated_points_data = updated_points_response.get_json()
    updated_points = updated_points_data["points"]

    # Assert that points did not increase after the second request
    assert initial_points == updated_points, "Points were updated despite restriction."



def test_award_points_invalid_status(client: FlaskClient) -> None:
    """Test awarding points with an invalid status"""
    user_token = create_test_user(client, email="user@example.com")
    parking_space_id = create_test_parking_space(client, user_token)

    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"status": "invalid"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["err"] == "Invalid status provided. Use 'taken' or 'parked'."

def test_award_points_daily_restriction(client: FlaskClient) -> None:
    """Test that points cannot be awarded more than once per day per spot finder."""
    driver_token = create_test_user(client, email="driver@example.com")
    spot_finder_token = create_test_user(client, email="spotfinder@example.com")
    parking_space_id = create_test_parking_space(client, spot_finder_token)

    # First reward
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {driver_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 200
    assert response.get_json()["result"] == "good"

    # Second reward within the same day
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {driver_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 200  # No error, but points should not update

    # Verify points remain unchanged
    response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {spot_finder_token}"}
    )
    points_data = response.json
    assert points_data
    assert points_data["points"]
    assert points_data["points"]['current'] == 10, "Points incorrectly updated after daily limit"

def test_award_points_2_hour_restriction(client: FlaskClient) -> None:
    """Test that points cannot be awarded more than once every 2 hours."""
    driver_token = create_test_user(client, email="driver@example.com")
    spot_finder_token = create_test_user(client, email="spotfinder@example.com")
    parking_space_id = create_test_parking_space(client, spot_finder_token)

    # First reward
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {driver_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 200
    assert response
    assert response.get_json()
    assert response.get_json()["result"] == "good"

    # Second reward within 2 hours
    response = client.post(
        f"/api/unstable/parking-spaces/{parking_space_id}/award-points",
        headers={"Authorization": f"Bearer {driver_token}"},
        data={"status": "parked"}
    )
    assert response.status_code == 200  # No error, but points should not update

    # Verify points remain unchanged
    response = client.get(
        "/api/unstable/auth/points",
        headers={"Authorization": f"Bearer {spot_finder_token}"}
    )
    points_data = response.json
    assert points_data
    assert points_data["points"]
    assert points_data["points"]['current'] == 10, "Points incorrectly updated after 2-hour restriction"
