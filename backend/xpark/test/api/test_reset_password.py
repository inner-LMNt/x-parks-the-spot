from flask.testing import FlaskClient

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
        json={"email": "testuser@example.com"}
    )
    assert response.status_code == 200
    assert response.json == {"message": "Password reset email sent"}

def test_reset_password_with_invalid_token(client: FlaskClient) -> None:
    # Try resetting the password with an invalid token
    response = client.post(
        "/api/unstable/auth/reset-password/invalid-token",
        json={"new_password": "NewPassword123"}
    )
    assert response.status_code == 400
    assert response.json == {"error": "Invalid or expired reset token"}

