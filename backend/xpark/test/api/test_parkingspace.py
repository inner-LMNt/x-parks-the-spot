import uuid
from decimal import Decimal, ROUND_HALF_UP

from flask.testing import FlaskClient
from typing import Dict, cast
import json

from xpark.test.utils.utils import create_test_user, create_test_parking_space


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
    assert response.json == {"spaces": []}

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
    assert len(response.json["spaces"]) == 1
    assert response.json["spaces"][0]["location"]["address"] == "aaa"

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
    assert response.json["spaces"][0]["location"]["address"] == "bbb"

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

def test_api_submit_rating_success(client: FlaskClient) -> None:
    """Test successful submission of ratings for a paid parking space"""
    token = create_test_user(client, email="ratinguser@example.com")
    spot_id = create_test_parking_space(client, token, is_paid=True)

    # Submit a rating
    rating_payload = {
        "availability_rating": 4,
        "cleanliness_rating": 5
        # total_rating removed since it's calculated
    }
    response = client.post(
        f"/api/unstable/parking-spaces/{spot_id}/rate",
        headers={"Authorization": f"Bearer {token}"},
        json=rating_payload
    )
    assert response.status_code == 200
    assert response.json == {}

    # Fetch the parking space to verify ratings
    response = client.get(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    parking_space = response.json
    assert parking_space is not None
    assert parking_space["avg_availability_rating"] == 4.0
    assert parking_space["ratings_count_availability"] == 1
    assert parking_space["avg_cleanliness_rating"] == 5.0
    assert parking_space["ratings_count_cleanliness"] == 1
    assert parking_space["avg_total_rating"] == 4.5


def test_api_submit_partial_rating(client: FlaskClient) -> None:
    """Test submission of partial ratings (only availability_rating)"""
    token = create_test_user(client, email="partialrating@example.com")
    spot_id = create_test_parking_space(client, token, is_paid=True)

    rating_payload = {
        "availability_rating": 3
    }
    response = client.post(
        f"/api/unstable/parking-spaces/{spot_id}/rate",
        headers={"Authorization": f"Bearer {token}"},
        json=rating_payload
    )
    assert response.status_code == 200
    assert response.json == {}

    response = client.get(
        f"/api/unstable/parking-spaces/{spot_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    parking_space = response.json
    assert parking_space is not None
    assert parking_space["avg_availability_rating"] == 3.0
    assert parking_space["ratings_count_availability"] == 1
    assert parking_space["avg_cleanliness_rating"] is None
    assert parking_space["ratings_count_cleanliness"] == 0
    assert parking_space["avg_total_rating"] == 3.0


def test_api_submit_rating_free_spot(client: FlaskClient) -> None:
    """Test that submitting a rating to a free parking space fails"""
    token = create_test_user(client, email="freespotrating@example.com")
    spot_id = create_test_parking_space(client, token, is_paid=False)

    rating_payload = {
        "availability_rating": 4,
        "cleanliness_rating": 5
    }
    response = client.post(
        f"/api/unstable/parking-spaces/{spot_id}/rate",
        headers={"Authorization": f"Bearer {token}"},
        json=rating_payload
    )
    assert response.status_code == 400
    assert response.json is not None
    assert "Cannot rate a free parking space" in response.json["err"]


def test_api_submit_rating_invalid_parking_space(client: FlaskClient) -> None:
    """Test submitting a rating to a non-existent parking space"""
    token = create_test_user(client, email="invalidspotrating@example.com")
    fake_spot_id = str(uuid.uuid4())

    rating_payload = {
        "availability_rating": 4,
        "cleanliness_rating": 5
    }
    response = client.post(
        f"/api/unstable/parking-spaces/{fake_spot_id}/rate",
        headers={"Authorization": f"Bearer {token}"},
        json=rating_payload
    )
    assert response.status_code == 400
    assert response.json is not None
    assert "Parking space does not exist" in response.json["err"]

def test_api_submit_rating_stress(client: FlaskClient) -> None:
    """Stress test for the /rate endpoint."""
    owner_token = create_test_user(client, email="owner@example.com")
    spot_id = create_test_parking_space(client, owner_token, is_paid=True)

    # Create multiple users
    num_users = 20
    user_tokens = []
    for i in range(num_users):
        email = f"user{i}@example.com"
        token = create_test_user(client, email=email)
        user_tokens.append(token)

    # Track ratings
    user_ratings = {token: {"availability": None, "cleanliness": None} for token in user_tokens}
    total_sum = Decimal('0.0')  # Track sum of individual total ratings
    total_count = 0

    # Initial rating submissions
    for i, token in enumerate(user_tokens):
        availability_rating = (i % 5) + 1
        cleanliness_rating = ((i + 2) % 5) + 1

        rating_payload = {
            "availability_rating": availability_rating,
            "cleanliness_rating": cleanliness_rating,
        }

        response = client.post(
            f"/api/unstable/parking-spaces/{spot_id}/rate",
            headers={"Authorization": f"Bearer {token}"},
            json=rating_payload
        )

        assert response.status_code == 200
        assert response.json == {}

        # Update tracking structures
        user_ratings[token]["availability"] = availability_rating  # type: ignore
        user_ratings[token]["cleanliness"] = cleanliness_rating  # type: ignore

        # Calculate this user's total rating using Decimal
        total_sum += (Decimal(str(availability_rating)) + Decimal(str(cleanliness_rating))) / Decimal('2.0')
        total_count += 1

        response = client.get(
            f"/api/unstable/parking-spaces/{spot_id}",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        parking_space = response.get_json()

        # Calculate expected averages using Decimal
        total_avail = sum(Decimal(str(r["availability"])) for r in user_ratings.values() if r["availability"] is not None)
        total_clean = sum(Decimal(str(r["cleanliness"])) for r in user_ratings.values() if r["cleanliness"] is not None)
        count_avail = sum(1 for r in user_ratings.values() if r["availability"] is not None)
        count_clean = sum(1 for r in user_ratings.values() if r["cleanliness"] is not None)

        expected_avg_availability = (total_avail / Decimal(str(count_avail))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        expected_avg_cleanliness = (total_clean / Decimal(str(count_clean))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        expected_avg_total = (total_sum / Decimal(str(total_count))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Assert all rating fields
        assert Decimal(str(parking_space["avg_availability_rating"])) == expected_avg_availability
        assert Decimal(str(parking_space["avg_cleanliness_rating"])) == expected_avg_cleanliness
        assert Decimal(str(parking_space["avg_total_rating"])) == expected_avg_total
        assert parking_space["ratings_count_availability"] == count_avail
        assert parking_space["ratings_count_cleanliness"] == count_clean

    # Update ratings
    for i, token in enumerate(user_tokens):
        new_availability_rating = ((i + 1) % 5) + 1
        new_cleanliness_rating = ((i + 3) % 5) + 1

        rating_payload = {
            "availability_rating": new_availability_rating,
            "cleanliness_rating": new_cleanliness_rating,
        }

        response = client.post(
            f"/api/unstable/parking-spaces/{spot_id}/rate",
            headers={"Authorization": f"Bearer {token}"},
            json=rating_payload
        )

        assert response.status_code == 200

        # Subtract old total and add new total using Decimal
        old_total = (Decimal(str(user_ratings[token]["availability"])) +
                    Decimal(str(user_ratings[token]["cleanliness"]))) / Decimal('2.0')
        new_total = (Decimal(str(new_availability_rating)) +
                    Decimal(str(new_cleanliness_rating))) / Decimal('2.0')
        total_sum = total_sum - old_total + new_total

        # Update ratings
        user_ratings[token]["availability"] = new_availability_rating  # type: ignore
        user_ratings[token]["cleanliness"] = new_cleanliness_rating  # type: ignore

        response = client.get(
            f"/api/unstable/parking-spaces/{spot_id}",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        parking_space = response.get_json()

        # Calculate expected averages using Decimal
        total_avail = sum(Decimal(str(r["availability"])) for r in user_ratings.values() if r["availability"] is not None)
        total_clean = sum(Decimal(str(r["cleanliness"])) for r in user_ratings.values() if r["cleanliness"] is not None)
        count_avail = sum(1 for r in user_ratings.values() if r["availability"] is not None)
        count_clean = sum(1 for r in user_ratings.values() if r["cleanliness"] is not None)

        expected_avg_availability = (total_avail / Decimal(str(count_avail))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        expected_avg_cleanliness = (total_clean / Decimal(str(count_clean))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        expected_avg_total = (total_sum / Decimal(str(total_count))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        assert Decimal(str(parking_space["avg_availability_rating"])) == expected_avg_availability
        assert Decimal(str(parking_space["avg_cleanliness_rating"])) == expected_avg_cleanliness
        assert Decimal(str(parking_space["avg_total_rating"])) == expected_avg_total
        assert parking_space["ratings_count_availability"] == count_avail
        assert parking_space["ratings_count_cleanliness"] == count_clean