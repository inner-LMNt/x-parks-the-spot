from flask.testing import FlaskClient
from typing import Dict, cast


def test_cars_with_color(client: FlaskClient) -> None:
    # Register a new user
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Bob Parker",
            "password": "BobRocks123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]
    headers = {"Authorization": "Bearer " + token}

    # 1. Create a car without color
    response = client.post(
        "/api/unstable/cars",
        headers=headers,
        json={
            "make": "Audi",
            "model": "A4",
            "license_plate": "ABC-1234",
            "license_plate_state": "PA",
            # 'color' is omitted
        },
    )
    assert response.status_code == 201
    assert response.json
    car_id_no_color = response.json["id"]

    # Retrieve the car and verify 'color' is explicitly None
    response = client.get(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json.get("color") is None
    assert response.json["license_plate"] == "ABC-1234"
    assert response.json["license_plate_state"] == "PA"

    # 2. Create a car with color
    response = client.post(
        "/api/unstable/cars",
        headers=headers,
        json={
            "make": "Toyota",
            "model": "Corolla",
            "license_plate": "XYZ-7890",
            "license_plate_state": "IN",
            "color": "Red",
        },
    )
    assert response.status_code == 201
    assert response.json
    car_id_with_color = response.json["id"]

    # Retrieve the car and verify 'color' is present and correctly set
    response = client.get(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["color"] == "Red"

    # 3. Update the car's color
    response = client.patch(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
        json={"color": "Blue"},
    )
    assert response.status_code == 200

    # Verify the color update
    response = client.get(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["color"] == "Blue"

    # 4. Attempt to remove the color attribute by setting it to None
    response = client.patch(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
        json={"color": None},  # Attempting to remove 'color'
    )
    assert response.status_code == 200

    # Verify that 'color' is still present and unchanged
    response = client.get(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["color"] == "Blue"

    # 5. Ensure that cars created without color remain with 'color' as None after other updates
    # Update the car's make
    response = client.patch(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
        json={"make": "Honda"},
    )
    assert response.status_code == 200

    # Retrieve the car and verify 'color' is still None
    response = client.get(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json.get("color") is None
    assert response.json["make"] == "Honda"

    # 6. Cleanup: Delete both cars
    response = client.delete(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
    )
    assert response.status_code == 200

    response = client.delete(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200

    # Verify that no cars remain
    response = client.get(
        "/api/unstable/cars", headers=headers
    )
    assert response.status_code == 200
    assert response.json == []

def test_cars(client: FlaskClient) -> None:
    # Register a new user
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Bob Parker",
            "password": "BobRocks123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]
    headers = {"Authorization": "Bearer " + token}

    # 1. Create a car without color
    response = client.post(
        "/api/unstable/cars",
        headers=headers,
        json={
            "make": "Audi",
            "model": "A4",
            "license_plate": "ABC-1234",
            "license_plate_state": "PA",
            # 'color' is omitted
        },
    )
    assert response.status_code == 201
    assert response.json
    car_id_no_color = response.json["id"]

    # Retrieve the car and verify 'color' is explicitly None
    response = client.get(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json.get("color") is None
    assert response.json["license_plate"] == "ABC-1234"
    assert response.json["license_plate_state"] == "PA"

    # 2. Create a car with color
    response = client.post(
        "/api/unstable/cars",
        headers=headers,
        json={
            "make": "Toyota",
            "model": "Corolla",
            "license_plate": "XYZ-7890",
            "license_plate_state": "IN",
            "color": "Red",
        },
    )
    assert response.status_code == 201
    assert response.json
    car_id_with_color = response.json["id"]

    # Retrieve the car and verify 'color' is present and correctly set
    response = client.get(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["color"] == "Red"

    # 3. Update the car's color
    response = client.patch(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
        json={"color": "Blue"},
    )
    assert response.status_code == 200

    # Verify the color update
    response = client.get(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["color"] == "Blue"

    # 4. Attempt to remove the color attribute by setting it to None
    response = client.patch(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
        json={"color": None},  # Attempting to remove 'color'
    )
    assert response.status_code == 200

    # Verify that 'color' is still present and unchanged
    response = client.get(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["color"] == "Blue"

    # 5. Ensure that cars created without color remain with 'color' as None after other updates
    # Update the car's make
    response = client.patch(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
        json={"make": "Honda"},
    )
    assert response.status_code == 200

    # Retrieve the car and verify 'color' is still None
    response = client.get(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json
    assert response.json.get("color") is None
    assert response.json["make"] == "Honda"

    # 6. Cleanup: Delete both cars
    response = client.delete(
        f"/api/unstable/cars/{car_id_no_color}",
        headers=headers,
    )
    assert response.status_code == 200

    response = client.delete(
        f"/api/unstable/cars/{car_id_with_color}",
        headers=headers,
    )
    assert response.status_code == 200

    # Verify that no cars remain
    response = client.get(
        "/api/unstable/cars", headers=headers
    )
    assert response.status_code == 200
    assert response.json == []