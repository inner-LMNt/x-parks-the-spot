from app.logic.user import *
from result import Ok, Err


def test_successful_create_user() -> None:
    user_id_create = create_user(
        name="Test User", email="testuser@example.com", password="secureP@ssW0rD!"
    )

    assert type(user_id_create) == Ok

    user_id_login = check_username_password("testuser@example.com", "secureP@ssW0rD!")
    assert type(user_id_login) == Ok
    assert user_id_create.ok_value == user_id_login.ok_value


def test_create_user_already_exists() -> None:
    assert (
        type(
            create_user(
                name="Test User",
                email="testuser1@example.com",
                password="secureP@ssW0rD!",
            )
        )
        == Ok
    )
    assert (
        type(
            create_user(
                name="Test User",
                email="testuser1@example.com",
                password="secureP@ssW0rD!",
            )
        )
        == Err
    )
