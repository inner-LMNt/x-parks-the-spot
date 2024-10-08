from xpark.utils.db import DB
from xpark.utils.password import password_hasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import uuid
import secrets
from xpark.config import Config
from result import Result, Ok, Err
from typing import cast, Tuple


def check_if_user_exists(email: str) -> bool:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(1) from users WHERE email = %s", (email,))
            return cur.fetchone() != (0,)


def create_user(name: str, email: str, password: str) -> Result[uuid.UUID, str]:
    if check_if_user_exists(email):
        return Err("Email already exists")

    # If it doesn't exist, then continue creating the user
    hash = password_hasher.hash(password)
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (name, email, hash),
            )
            new_user = cast(Tuple[uuid.UUID, str, str], cur.fetchone())
            return Ok(new_user[0])


def check_username_password(email: str, password: str) -> Result[uuid.UUID, str]:
    if not check_if_user_exists(email):
        return Err("Wrong Password")

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_hash from users WHERE email = %s", (email,)
            )

            (user_id, correct_hashed_password) = cast(
                Tuple[uuid.UUID, str], cur.fetchone()
            )

            # Ew, exceptions
            try:
                password_hasher.verify(correct_hashed_password, password)
                # We have a correct password here

                if password_hasher.check_needs_rehash(correct_hashed_password):
                    # Set new password if the hashing parameters have changed
                    change_password(user_id, password)

                return Ok(user_id)
            except VerifyMismatchError:
                return Err("Wrong Password")
            except VerificationError:
                # Do we need special handling? When will this ever run?
                return Err("Wrong Password")


def change_password(id: uuid.UUID, new_password: str) -> Result[None, None]:
    new_password_hash = password_hasher.hash(new_password)
    with DB.pool.connection() as conn:
        conn.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s", (new_password_hash, id)
        )
        return Ok(None)


def create_token(user_id: uuid.UUID) -> str:
    token = Config.TOKEN_PREFIX + secrets.token_urlsafe(32)

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_tokens (user_id, token, expiry)
                VALUES (%s, %s, NOW() + make_interval(secs => %s))
                """,
                (
                    user_id,
                    token,
                    Config.TOKEN_EXPIRY_SECONDS,
                ),
            )

            # Clean up any expired tokens in the database
            cur.execute("DELETE FROM user_tokens WHERE expiry <= NOW()")

            return token

def validate_token_and_refresh(token: str) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_tokens
                SET expiry = NOW() + make_interval(secs => %s)
                WHERE token = %s AND expiry > NOW()
                RETURNING user_id
                """,
                (
                    Config.TOKEN_EXPIRY_SECONDS,
                    token,
                ),
            )
            result = cur.fetchone()
            if result:
                user_id = result[0]
                return Ok(user_id)

            return Err("Token expired")



def expire_valid_token(token: str) -> Result[None, None]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_tokens WHERE token = %s", (token,)
            )

            if cur.rowcount == 0:
                return Err(None)

            return Ok(None)


def expire_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
            return Ok(None)
