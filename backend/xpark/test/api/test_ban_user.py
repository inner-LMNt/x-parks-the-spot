from flask.testing import FlaskClient
from pytest_mock import MockerFixture
from ..utils.utils import (
    create_test_parking_space,
    create_test_reservation,
    get_user_id_from_token,
    create_test_user,
)
from typing import Any

def test_ban_user_success(client: FlaskClient, mocker: Any) -> None:
    """Test banning a user with all cascading effects."""

    # Create an admin and a user to be banned
    admin_token = create_test_user(client, email="admin@example.com")  # Admin token
    banned_user_token = create_test_user(client, email="banned_user@example.com")

    # Ensure the banned user can initially log in
    login_response = client.post(
        "/api/unstable/auth/login",
        json={"email": "banned_user@example.com", "password": "TestPass123!"},
    )
    assert login_response.status_code == 200

    # Fetch user ID of the banned user
    banned_user_id = get_user_id_from_token(client, banned_user_token)

    # Ban the user
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "userId": banned_user_id,
            "rationale": "Violation of terms.",
        },
    )
    assert response.status_code == 200
    assert response
    assert response.json
    assert response.json["message"] == "User has been banned successfully"

    # Ensure the banned user cannot log in anymore
    login_response = client.post(
        "/api/unstable/auth/login",
        json={"email": "banned_user@example.com", "password": "TestPass123!"},
    )
    assert login_response.status_code == 401, "Banned user was able to log in"


def test_ban_user_cancel_future_reservations(client: FlaskClient, mocker: MockerFixture) -> None:
    """Test banning a user with future reservation cancellations."""

    # Create admin, user to be banned, and renter
    admin_token = create_test_user(client, email="admin@example.com")
    banned_user_token = create_test_user(client, email="banned_user@example.com")
    renter_token = create_test_user(client, email="renter@example.com")

    # Fetch user ID of the banned user
    banned_user_id = get_user_id_from_token(client, banned_user_token)

    # Create a parking space owned by the banned user
    space_id = create_test_parking_space(client, banned_user_token)

    # Create a reservation for the renter
    reservation_id = create_test_reservation(client, renter_token, space_id)

    # Ban the user
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "userId": banned_user_id,
            "rationale": "Violation of terms.",
        },
    )
    assert response.status_code == 200
    assert response
    assert response.json
    assert response.json["message"] == "User has been banned successfully"

    # Fetch the reservation details to ensure it is canceled
    reservation_response = client.get(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {renter_token}"},
    )
    assert reservation_response.status_code == 404

def test_ban_user_admin_spots_deleted(client: FlaskClient, mocker: MockerFixture) -> None:
    """Test that all spots owned by the banned admin are deleted."""

    # Create an admin and a user
    admin_token = create_test_user(client, email="admin@example.com")
    banned_admin_token = create_test_user(client, email="banned_admin@example.com")

    # Fetch admin user ID
    banned_admin_id = get_user_id_from_token(client, banned_admin_token)

    # Create parking spaces owned by the admin
    space_id1 = create_test_parking_space(client, banned_admin_token, name="Space 1")
    space_id2 = create_test_parking_space(client, banned_admin_token, name="Space 2")

    # Ban the admin
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "userId": banned_admin_id,
            "rationale": "Violation of terms.",
        },
    )

    assert response.status_code == 200
    assert response
    assert response.json
    assert response.json["message"] == "User has been banned successfully"

    # Verify that the admin's parking spaces are deleted
    for space_id in [space_id1, space_id2]:
        response = client.get(
            f"/api/unstable/parking-spaces/{space_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404, f"Parking space {space_id} was not deleted."


def test_ban_user_reservations_canceled(client: FlaskClient, mocker: MockerFixture) -> None:
    """Test that all future reservations made by the banned user are canceled."""

    # Create admin, user to be banned, and parking space owners
    admin_token = create_test_user(client, email="admin@example.com")
    banned_user_token = create_test_user(client, email="banned_user@example.com")
    owner_token = create_test_user(client, email="owner@example.com")

    # Fetch user ID of the banned user
    banned_user_id = get_user_id_from_token(client, banned_user_token)

    # Create a parking space owned by another user
    space_id = create_test_parking_space(client, owner_token)

    # Create a reservation for the banned user
    reservation_id = create_test_reservation(client, banned_user_token, space_id)


    # Ban the user
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "userId": banned_user_id,
            "rationale": "Violation of terms.",
        },
    )
    assert response.status_code == 200

    # Verify the reservation is canceled
    reservation_response = client.get(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert reservation_response.status_code == 404


def test_ban_user_notifications(client: FlaskClient, mocker: MockerFixture) -> None:
    """Test that appropriate notifications are sent to renters and owners."""

    # Create admin, user to be banned, renter, and parking space owner
    admin_token = create_test_user(client, email="admin@example.com")
    banned_user_token = create_test_user(client, email="banned_user@example.com")
    renter_token = create_test_user(client, email="renter@example.com")

    # Fetch user ID of the banned user
    banned_user_id = get_user_id_from_token(client, banned_user_token)

    # Create a parking space owned by the banned user
    space_id = create_test_parking_space(client, banned_user_token)

    # Create a reservation for the renter on the banned user’s space
    create_test_reservation(client, renter_token, space_id)

    # Ban the user
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "userId": banned_user_id,
            "rationale": "Violation of terms.",
        },
    )
    assert response.status_code == 200



def test_ban_user_cannot_log_in(client: FlaskClient, mocker: MockerFixture) -> None:
    """Test that a banned user cannot log in and receives a rationale email."""

    # Create an admin and a user to be banned
    admin_token = create_test_user(client, email="admin@example.com")
    banned_user_token = create_test_user(client, email="banned_user@example.com")

    # Fetch user ID of the banned user
    banned_user_id = get_user_id_from_token(client, banned_user_token)

    # Ban the user
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "userId": banned_user_id,
            "rationale": "Violation of terms.",
        },
    )
    assert response.status_code == 200

    # Ensure the banned user cannot log in anymore
    login_response = client.post(
        "/api/unstable/auth/login",
        json={"email": "banned_user@example.com", "password": "TestPass123!"},
    )
    assert login_response.status_code == 401, "Banned user was able to log in"

def test_ban_user_reservations_owned_by_banned_user(client: FlaskClient, mocker: MockerFixture) -> None:
    """Test canceling reservations on spaces owned by a banned user."""
    admin_token = create_test_user(client, "admin@example.com")
    owner_token = create_test_user(client, "owner@example.com")
    renter_token = create_test_user(client, "renter@example.com")

    # Create parking space owned by the user to be banned
    space_id = create_test_parking_space(client, owner_token)

    # Create a reservation on that space
    reservation_id = create_test_reservation(client, renter_token, space_id)

    # Ban the owner
    owner_id = get_user_id_from_token(client, owner_token)
    response = client.post(
        "/api/unstable/admin/ban-user",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"userId": owner_id, "rationale": "Violation of terms."},
    )
    assert response.status_code == 200

    # Verify the reservation is canceled
    response = client.get(
        f"/api/unstable/reservations/{reservation_id}",
        headers={"Authorization": f"Bearer {renter_token}"},
    )
    assert response.status_code == 404, "Reservation not canceled."
