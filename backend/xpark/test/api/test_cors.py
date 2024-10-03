from flask.testing import FlaskClient


def test_cors(client: FlaskClient) -> None:
    # Ensure that if the route is not CORSified, then it won't have the headers
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") is None
    assert response.headers.get("Access-Control-Allow-Headers") is None
    assert response.headers.get("Access-Control-Allow-Methods") is None

    # Ensure headers are set for 200 requests
    response = client.get("/api/unstable/version")
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "*"
    assert response.headers.get("Access-Control-Allow-Headers") == "X-PINGOTHER, Content-Type"
    assert response.headers.get("Access-Control-Allow-Methods") == "*"

    # Ensure headers are not set for invalid API endpoints
    response = client.get("/api/unstable/auth/invalid")
    assert response.status_code == 404
    assert response.headers.get("Access-Control-Allow-Origin") is None
    assert response.headers.get("Access-Control-Allow-Headers") is None
    assert response.headers.get("Access-Control-Allow-Methods") is None

    # Ensure headers are set for valid non-200 responses
    response = client.post("/api/unstable/auth/logout")
    assert response.status_code == 403
    assert response.headers.get("Access-Control-Allow-Origin") == "*"
    assert response.headers.get("Access-Control-Allow-Headers") == "X-PINGOTHER, Content-Type"
    assert response.headers.get("Access-Control-Allow-Methods") == "*"

    # Ensure headers are set for 400 responses (missing data)
    response = client.post(
        "/api/unstable/auth/register",
        json={
            "email": "goodemail@example.com",
            "full_name": "Bob Parker",
            # missing password field
        },
    )
    assert response.status_code == 400
    assert response.headers.get("Access-Control-Allow-Origin") == "*"
    assert response.headers.get("Access-Control-Allow-Headers") == "X-PINGOTHER, Content-Type"
    assert response.headers.get("Access-Control-Allow-Methods") == "*"

    # Ensure headers are set for 401 responses
    response = client.post(
        "/api/unstable/auth/login",
        json={
            "email": "goodemail@example.com",
            "password": "badpassword",
        },
    )
    assert response.status_code == 401
    assert response.headers.get("Access-Control-Allow-Origin") == "*"
    assert response.headers.get("Access-Control-Allow-Headers") == "X-PINGOTHER, Content-Type"
    assert response.headers.get("Access-Control-Allow-Methods") == "*"
