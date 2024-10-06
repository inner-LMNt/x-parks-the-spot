from xpark.logic.user import (
    check_username_password,
    create_user,
    create_token,
    expire_valid_token,
    expire_all_tokens_for_user,
)
from result import Ok, Err
from argon2 import PasswordHasher


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
        type(
            create_user(
                name="Test User",
                email="testuser1@example.com",
                password="secureP@ssW0rD!",
            )
        )
        is Ok
    )
    assert (
        type(
            create_user(
                name="Test User",
                email="testuser1@example.com",
                password="secureP@ssW0rD!",
            )
        )
        is Err
    )


def test_user_update_password_hash() -> None:
    from xpark.utils.db import DB

    user_id_create = create_user(
        name="Test User",
        email="testuser1@example.com",
        password="password",
    )

    assert type(user_id_create) is Ok

    password_hasher = PasswordHasher(time_cost=2)
    weakly_hashed_password = password_hasher.hash("password")

    with DB.pool.connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE email = 'testuser1@example.com'",
            (weakly_hashed_password,),
        )

    # Ensure coverage of password rehashing
    # The current system has a default time_cost of 3, so this should trigger the rehash mechanism
    user_id_login = check_username_password("testuser1@example.com", "password")

    assert type(user_id_login) is Ok

    assert user_id_create == user_id_login


def test_delete_all_tokens_for_user() -> None:
    user_id_create = create_user(
        name="Test User",
        email="testuser1@example.com",
        password="password",
    )

    assert type(user_id_create) is Ok

    token0 = create_token(user_id_create.ok_value)
    token1 = create_token(user_id_create.ok_value)
    token2 = create_token(user_id_create.ok_value)

    assert type(expire_valid_token(token0)) is Ok
    assert type(expire_valid_token(token0)) is Err
    assert type(expire_all_tokens_for_user(user_id_create.ok_value)) is Ok
    assert type(expire_valid_token(token1)) is Err
    assert type(expire_valid_token(token2)) is Err
