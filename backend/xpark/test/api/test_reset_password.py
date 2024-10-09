from flask.testing import FlaskClient
from typing import cast, Tuple


def test_request_password_reset(client: FlaskClient) -> None:
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

    # Request password reset
    response = client.post(
        "/api/unstable/auth/password-reset-request",
        json={"email": "testuser@example.com"},
    )
    assert response.status_code == 200
    assert response.json == {"message": "Password reset email sent"}

    # Extract the token from the DB and try using it
    from xpark.utils.db import DB

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_pw_reset_requests.token FROM users JOIN user_pw_reset_requests ON user_pw_reset_requests.user_id = users.id WHERE users.email = %s",
                ("testuser@example.com",),
            )
            reset_token = cast(Tuple[str], cur.fetchone())[0]

            # Try confirming delete with an invalid token
            response = client.post(
                f"/api/unstable/auth/reset-password/{reset_token}",
                json={"new_password": "NewPassword!!!!"},
            )
            assert response.status_code == 200


def test_reset_password_with_invalid_token(client: FlaskClient) -> None:
    # Try resetting the password with an invalid token
    response = client.post(
        "/api/unstable/auth/reset-password/invalid-token",
        json={"new_password": "NewPassword123"},
    )
    assert response.status_code == 403
    assert response.json == {"err": "Invalid or expired token"}
