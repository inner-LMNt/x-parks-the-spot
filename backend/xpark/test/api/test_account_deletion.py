from flask.testing import FlaskClient
from typing import Dict, cast, Tuple
from xpark.logic.user import validate_token_and_refresh
from result import Ok, Err


def test_request_delete_account(client: FlaskClient) -> None:
    # Assuming you have a registered user to get the token
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]

    # Simulate the request to delete the account
    response = client.post(
        "/api/unstable/auth/request_delete_account",
        headers={"Authorization": "Bearer " + token},
        json={"password": "TestPassword123"},  # include password in the request
    )
    assert response.status_code == 200
    assert response.json == {"message": "Account deletion email sent"}


def test_request_delete_account_invalid_password(client: FlaskClient) -> None:
    # Register a user first
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]

    # Attempt to delete the account with an invalid password
    response = client.post(
        "/api/unstable/auth/request_delete_account",
        headers={"Authorization": "Bearer " + token},
        json={"password": "WrongPassword"},  # wrong password
    )
    assert response.status_code == 401


def test_confirm_delete_account(client: FlaskClient) -> None:
    # Try confirming delete with an invalid token
    response = client.get("/api/unstable/auth/confirm-delete/invalid-token")
    assert response.status_code == 403

    # Create a user and then delete it
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 201
    token = cast(Dict[str, str], response.json)["access_token"]
    # Attempt to delete the account with an invalid password
    response = client.post(
        "/api/unstable/auth/request_delete_account",
        headers={"Authorization": "Bearer " + token},
        json={"password": "TestPassword123"},  # wrong password
    )

    # Extract the generated deletion token from the DB
    from xpark.utils.db import DB

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_delete_requests.token FROM users JOIN user_delete_requests ON user_delete_requests.user_id = users.id WHERE users.email = %s",
                ("testuser@example.com",),
            )
            deletion_token = cast(Tuple[str], cur.fetchone())[0]

            # Try confirming delete with an invalid token
            response = client.get(f"/api/unstable/auth/confirm-delete/{deletion_token}")
            assert response.status_code == 200


def test_delete_account(client: FlaskClient) -> None:
    # Create a user and then delete it
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 201
    token0 = cast(Dict[str, str], response.json)["access_token"]
    # Attempt to delete the account with an invalid password
    response = client.post(
        "/api/unstable/auth/login",
        json={"email": "testuser@example.com", "password": "TestPassword123"},
    )
    assert response.status_code == 201
    token1 = cast(Dict[str, str], response.json)["access_token"]

    # Ensure both tokens work
    assert type(validate_token_and_refresh(token0)) is Ok
    assert type(validate_token_and_refresh(token1)) is Ok

    # Delete user
    response = client.post(
        "/api/unstable/auth/request_delete_account",
        headers={"Authorization": "Bearer " + token0},
        json={"password": "TestPassword123"},  # wrong password
    )

    # Extract the generated deletion token from the DB
    from xpark.utils.db import DB

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_delete_requests.token FROM users JOIN user_delete_requests ON user_delete_requests.user_id = users.id WHERE users.email = %s",
                ("testuser@example.com",),
            )
            deletion_token = cast(Tuple[str], cur.fetchone())[0]

            # Try confirming delete with an invalid token
            response = client.get(f"/api/unstable/auth/confirm-delete/{deletion_token}")
            assert response.status_code == 200

    # Ensure that tokens are invalidated and deleted
    assert type(validate_token_and_refresh(token0)) is Err
    assert type(validate_token_and_refresh(token1)) is Err
