from xpark.config import Config
from flask.testing import FlaskClient
from typing import Dict, cast


def test_api_register(client: FlaskClient) -> None:
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Bob Parker",
            "password": "BobRocks123",
        },
    )
    assert response.status_code == 201
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Pob Parker",
            "password": "PobRocks123",
        },
    )
    assert response.status_code == 409


def test_api_auth(client: FlaskClient) -> None:
    response = client.post("/api/unstable/auth/logout")
    assert response.status_code == 403  # 403 when no token is passed

    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Bob Parker",
            "password": "BobRocks123",
        },
    )
    token = cast(Dict[str, str], response.json)["access_token"]
    assert token[0 : len(Config.TOKEN_PREFIX)] == Config.TOKEN_PREFIX
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 401  # 401 when wrong token is passed

    # Test logging back in
    response = client.post(
        "/api/unstable/auth/login",
        json={
            "email": "goodemail@example.com",
            "password": "BobRocks123",
        },
    )
    token = cast(Dict[str, str], response.json)["access_token"]
    assert token[0 : len(Config.TOKEN_PREFIX)] == Config.TOKEN_PREFIX
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 401  # 401 when wrong token is passed

    # Test bad login
    response = client.post(
        "/api/unstable/auth/login",
        json={
            "email": "goodemail@example.com",
            "password": "WrongPassword",
        },
    )
    assert response.status_code == 401

    # Test logging out with no auth
    response = client.post("/api/unstable/auth/logout")
    assert response.status_code == 403

    # Test logging out with bad auth header
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "xpark_93429403290"}
    )
    assert response.status_code == 400
