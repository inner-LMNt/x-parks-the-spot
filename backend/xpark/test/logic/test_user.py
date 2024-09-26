from xpark.logic.user import check_username_password, create_user
from result import Ok, Err


def test_successful_create_user() -> None:
    user_id_create = create_user(
        name="Test User", email="testuser@example.com", password="secureP@ssW0rD!"
    )

    assert type(user_id_create) is Ok

    user_id_login = check_username_password("testuser@example.com", "secureP@ssW0rD!")

    assert type(user_id_login) is Ok
    assert user_id_create.ok_value == user_id_login.ok_value


def test_create_user_already_exists() -> None:
    assert (
        create_user(
            name="Test User",
            email="testuser1@example.com",
            password="secureP@ssW0rD!",
        )
        is Ok
    )
    assert (
        create_user(
            name="Test User",
            email="testuser1@example.com",
            password="secureP@ssW0rD!",
        )
        is Err
    )
