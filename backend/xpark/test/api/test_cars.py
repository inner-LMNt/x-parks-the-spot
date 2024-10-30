from flask.testing import FlaskClient
from typing import Dict, cast


def test_cars(client: FlaskClient) -> None:
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
    # Create a car
    response = client.post(
        "/api/unstable/cars",
        headers={"Authorization": "Bearer " + token},
        json={
            "make": "Audi",
            "model": "A4",
            "license_plate": "PA ABC-1234",
        },
    )
    assert response.status_code == 201
    assert response.json
    car_id = response.json["id"]

    response = client.get(
        f"/api/unstable/cars/{car_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["license_plate"] == "PA ABC-1234"

    response = client.delete(
        f"/api/unstable/cars/{car_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    response = client.get(
        "/api/unstable/cars", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    assert response.json == []
    # Create a car to be modified
    response = client.post(
        "/api/unstable/cars",
        headers={"Authorization": "Bearer " + token},
        json={
            "make": "Audi",
            "model": "A5",
            "license_plate": "IN XYZ-7890",
        },
    )
    assert response.status_code == 201
    assert response.json
    car_id = response.json["id"]

    response = client.get(
        f"/api/unstable/cars/{car_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["make"] == "Audi"

    response = client.patch(
        f"/api/unstable/cars/{car_id}",
        headers={"Authorization": "Bearer " + token},
        json={"make": "Toyota"},
    )
    assert response.status_code == 200

    response = client.get(
        f"/api/unstable/cars/{car_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    assert response.json
    assert response.json["make"] == "Toyota"
