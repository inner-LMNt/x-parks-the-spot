from flask.testing import FlaskClient
from typing import Dict, cast, Any
import json


def test_api_create_free_parking_spot(client: FlaskClient) -> None:
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
    response = client.post(
        "/api/unstable/parking-spaces",
        headers={"Authorization": "Bearer " + token},
        data={
            "data": json.dumps(
                {
                    "lat": 40.423780934987015,
                    "long": -86.92499152827456,
                    "is_paid": False,
                    "address": "aaa",
                }
            )
        },
    )
    assert response.status_code == 201

    # response = client.post(
    #     "/api/unstable/search",
    #     headers={"Authorization": "Bearer " + token},
    #     json={"lat": 40.4237, "long": -86.9249, "radius": 100},
    # )
    # assert response.status_code == 200
    # assert len(cast(list[Any], response.json)) == 1
    #
    # response = client.post(
    #     "/api/unstable/search",
    #     headers={"Authorization": "Bearer " + token},
    #     json={"lat": 40.4237, "long": -87.9249, "radius": 100},
    # )
    # assert response.status_code == 200
    # assert len(cast(list[Any], response.json)) == 0

def test_api_create_paid_parking_spot(client: FlaskClient) -> None:
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
    response = client.post(
        "/api/unstable/parking-spaces",
        headers={"Authorization": "Bearer " + token},
        data={
            "data": json.dumps(
                {
                    "lat": 40.423780934987015,
                    "long": -86.92499152827456,
                    "is_paid": True,
                    "address": "aaa",
                }
            )
        },
    )
    assert response.status_code == 201
