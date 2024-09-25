from app.config import Config


def test_api_register(client) -> None:
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
    assert response.status_code == 400


def test_api_auth(client) -> None:
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
    token = response.json["access_token"]
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
    token = response.json["access_token"]
    assert token[0 : len(Config.TOKEN_PREFIX)] == Config.TOKEN_PREFIX
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 200
    response = client.post(
        "/api/unstable/auth/logout", headers={"Authorization": "Bearer " + token}
    )
    assert response.status_code == 401  # 401 when wrong token is passed
