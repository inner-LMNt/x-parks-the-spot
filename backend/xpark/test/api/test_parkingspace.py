from flask.testing import FlaskClient
from typing import Dict, cast
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
                    "location": {
                        "latitude": 40.423780934987015,
                        "longitude": -86.92499152827456,
                        "address": "aaa",
                    },
                    "is_paid": False,
                }
            )
        },
    )
    assert response.status_code == 201
    assert response.json
    spot_id = response.json["id"]

    response = client.get(f"/api/unstable/parking-spaces/{spot_id}")
    assert response.status_code == 200
    assert response.json
    assert not response.json["is_paid"]

    response = client.delete(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 200
    response = client.get(
        "/api/unstable/parking-spaces", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    assert response.json == {"paidSpaces": []}

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
                    "is_paid": True,
                    "location": {
                        "latitude": 40.4297,
                        "longitude": -86.9389,
                        "address": "aaa",
                    },
                    "features": [],
                    "photos": [],
                    "name": "name",
                    "availability_schedule": [
                        {
                            "day_of_week": "Monday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                        {
                            "day_of_week": "Tuesday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                        {
                            "day_of_week": "Wednesday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                        {
                            "day_of_week": "Thursday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                        {
                            "day_of_week": "Friday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                        {
                            "day_of_week": "Saturday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                        {
                            "day_of_week": "Sunday",
                            "start_time": "00:00",
                            "end_time": "23:59",
                        },
                    ],
                    "pricing_info": {"base_price": 10, "dynamic_pricing": False},
                }
            )
        },
    )
    assert response.status_code == 201
    assert response.json
    spot_id = response.json["id"]

    response = client.get(
        "/api/unstable/parking-spaces", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    assert response.json
    assert len(response.json["paidSpaces"]) == 1
    assert response.json["paidSpaces"][0]["location"]["address"] == "aaa"

    # Modify the address
    response = client.patch(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": "Bearer " + token},
        json={
            "location": {
                "address": "bbb",
            }
        },
    )
    assert response.status_code == 200
    assert response.json
    # Not checking the whole thing because the created_at and modified_at times are not stable across reruns
    print(response.json)
    assert response.json["location"]["address"] == "bbb"
    assert response.json["location"]["latitude"] == 40.4297
    assert response.json["location"]["longitude"] == -86.9389

    response = client.get(
        "/api/unstable/parking-spaces", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    assert response.json
    assert len(response.json) == 1
    # Not checking the whole thing because the created_at and modified_at times are not stable across reruns
    assert response.json["paidSpaces"][0]["location"]["address"] == "bbb"

    # Now delete
    response = client.delete(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 403
    response = client.get(
        "/api/unstable/parking-spaces", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    assert response.json
    assert len(response.json) == 1
