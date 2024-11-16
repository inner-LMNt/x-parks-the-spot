from flask.testing import FlaskClient
from typing import Dict, cast, Any

def create_test_user(client: FlaskClient) -> str:
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 201
    response_json = cast(Dict[str, Any], response.json)
    return str(response_json["access_token"])

def test_set_user_location(client: FlaskClient) -> None:
    token = create_test_user(client)

    # Set user location
    response = client.post(
        "/api/unstable/auth/user-location",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "state": "CA",
            "city": "Los Angeles",
        },
    )
    assert response.status_code == 200
    response_json = cast(Dict[str, Any], response.json)
    assert response_json["message"] == "User location set successfully"

    # Retrieve user location
    response = client.get(
        "/api/unstable/auth/user-location",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    response_json = cast(Dict[str, Any], response.json)
    assert response_json["state"] == "CA"
    assert response_json["city"] == "Los Angeles"

def test_set_user_location_with_none_city(client: FlaskClient) -> None:
    token = create_test_user(client)

    # Set user location with "none" as city
    response = client.post(
        "/api/unstable/auth/user-location",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "state": "CA",
            "city": "none",
        },
    )
    assert response.status_code == 200
    response_json = cast(Dict[str, Any], response.json)
    assert response_json["message"] == "User location set successfully"

    # Retrieve user location
    response = client.get(
        "/api/unstable/auth/user-location",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    response_json = cast(Dict[str, Any], response.json)
    assert response_json["state"] == "CA"
    assert response_json["city"] == "None"

def test_set_user_location_invalid_city(client: FlaskClient) -> None:
    token = create_test_user(client)

    # Attempt to set user location with an invalid city
    response = client.post(
        "/api/unstable/auth/user-location",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "state": "CA",
            "city": "InvalidCity",
        },
    )
    assert response.status_code == 404
    response_json = cast(Dict[str, Any], response.json)
    assert response_json["err"] == "Invalid city-state combination"