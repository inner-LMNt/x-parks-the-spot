from flask.testing import FlaskClient
from ..utils.utils import create_test_user, create_test_parking_space
from xpark.utils.db import DB


def test_buy_and_get_raffle_entries(client: FlaskClient) -> None:
    # Create user1
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "user1@example.com",
            "full_name": "User1",
            "password": "TestPass123!",
        },
    )
    assert response.status_code == 201
    user1 = response.get_json()["access_token"]

    # Create user2
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "user2@example.com",
            "full_name": "User2",
            "password": "TestPass123!",
        },
    )
    assert response.status_code == 201
    user2 = response.get_json()["access_token"]

    # Give them points
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                     UPDATE users
                     SET points = jsonb_set(points, '{current}', '10000'::jsonb, true)
                     """
            )

    # Buy 10 raffle tickets for user1
    for _ in range(10):
        response = client.post(
            "/api/unstable/auth/shop/buy-raffle",
            headers={"Authorization": f"Bearer {user1}"},
            json={"raffleId": 4},
        )
        assert response.status_code == 200

    response = client.get(
        "/api/unstable/auth/raffle-tickets",
        headers={"Authorization": f"Bearer {user1}"},
    )
    assert response.status_code == 200
    assert response.get_json()["tickets"] == {"count": 10}

    response = client.get(
        "/api/unstable/auth/transaction-history",
        headers={"Authorization": f"Bearer {user1}"},
    )
    assert response.status_code == 200
    assert len(response.get_json()["transactions"]) == 10

    # Buy 5 raffle tickets for user2
    for _ in range(5):
        response = client.post(
            "/api/unstable/auth/shop/buy-raffle",
            headers={"Authorization": f"Bearer {user2}"},
            json={"raffleId": 4},
        )
        assert response.status_code == 200

    response = client.get(
        "/api/unstable/auth/raffle-tickets",
        headers={"Authorization": f"Bearer {user2}"},
    )
    assert response.status_code == 200
    assert response.get_json()["tickets"] == {"count": 5}

    response = client.get(
        "/api/unstable/auth/transaction-history",
        headers={"Authorization": f"Bearer {user2}"},
    )
    assert response.status_code == 200
    assert len(response.get_json()["transactions"]) == 5

    # Get raffle entries
    response = client.get(
        "/api/unstable/admin/get-raffle-entries",
        headers={"Authorization": f"Bearer {user1}"},
    )

    assert response.status_code == 200
    assert len(response.get_json()) == 2
    assert response.get_json()[0]["username"] == "User1"
    assert response.get_json()[0]["tickets"] == 10
    assert response.get_json()[1]["username"] == "User2"
    assert response.get_json()[1]["tickets"] == 5


def test_perform_raffle(
    client: FlaskClient,
) -> None:  # Need to test without sending email
    pass


def test_handle_buy_and_get_badge(client: FlaskClient) -> None:
    # Create a user
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "user1@example.com",
            "full_name": "User1",
            "password": "TestPass123!",
        },
    )
    assert response.status_code == 201
    user1 = response.get_json()["access_token"]

    # Give them points
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                     UPDATE users
                     SET points = jsonb_set(points, '{current}', '10000'::jsonb, true)
                     """
            )

    # Buy bronze badge
    response = client.post(
        "/api/unstable/auth/shop/buy-badge",
        headers={"Authorization": f"Bearer {user1}"},
        json={"badgeId": 1},
    )
    assert response.status_code == 200

    # Check if the user has the badge
    response = client.get(
        "/api/unstable/auth/badge-list", headers={"Authorization": f"Bearer {user1}"}
    )
    assert response.status_code == 200
    assert response.get_json()["badges"] == ["1"]

    # Buy silver badge
    response = client.post(
        "/api/unstable/auth/shop/buy-badge",
        headers={"Authorization": f"Bearer {user1}"},
        json={"badgeId": 2},
    )

    # Buy gold badge
    response = client.post(
        "/api/unstable/auth/shop/buy-badge",
        headers={"Authorization": f"Bearer {user1}"},
        json={"badgeId": 3},
    )

    # Check if the user has the badge
    response = client.get(
        "/api/unstable/auth/badge-list", headers={"Authorization": f"Bearer {user1}"}
    )
    assert response.status_code == 200
    assert response.get_json()["badges"] == ["1", "2", "3"]

    # Check transaction history
    response = client.get(
        "/api/unstable/auth/transaction-history",
        headers={"Authorization": f"Bearer {user1}"},
    )
    assert response.status_code == 200
    print(response.get_json())
    assert len(response.get_json()["transactions"]) == 3
