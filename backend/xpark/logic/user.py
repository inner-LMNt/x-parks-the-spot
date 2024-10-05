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


# If it returns None, then the user already exists
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
                # Do we need special handling?
                return Err("Wrong Password")


def change_password(id: uuid.UUID, new_password: str) -> Result[None, None]:
    new_password_hash = password_hasher.hash(new_password)
    with DB.pool.connection() as conn:
        conn.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s", (new_password_hash, id)
        )
        return Ok(None)


# Function to create a new token and store it in PostgreSQL
def create_token(user_id: uuid.UUID) -> str:
    # Generate a random token string, prefixing it with a value from the config (e.g., 'Bearer')
    token = Config.TOKEN_PREFIX + secrets.token_urlsafe(32)

    # Use `with` to ensure the connection and transaction are handled properly
    with DB.pool.connection() as conn:
        # Use `with` for cursor to ensure it's closed correctly
        with conn.cursor() as cur:
            # Insert the token into the user_tokens table using parameterized query to avoid SQL injection
            cur.execute(
                "INSERT INTO user_tokens (user_id, token, expiry) VALUES (%s, %s, NOW() + INTERVAL '1 hour')",
                (user_id, token)  # Use tuple for sanitization
            )

    # Return the generated token
    return token

def validate_token_and_refresh(token: str) -> Result[uuid.UUID, str]:
    # Open a connection to the database and ensure it's properly closed when done
    with DB.pool.connection() as conn:
        # Open a cursor to execute SQL queries within this connection
        with conn.cursor() as cur:
            # Clean up any expired tokens in the database
            # This query removes all tokens from the 'user_tokens' table that have an expiry time
            # that is before or equal to the current time (i.e., expired tokens)
            cur.execute("DELETE FROM user_tokens WHERE expiry <= NOW()")

            # Check if the given token is still valid (not expired) and refresh its expiry time
            # This query updates the 'expiry' of the given token by setting it to the current time (NOW)
            # plus a configured amount of seconds (from Config.TOKEN_EXPIRY_SECONDS).
            # If the token exists and is still valid, it returns the associated 'user_id'.
            cur.execute(
                """
                UPDATE user_tokens
                SET expiry = NOW() + INTERVAL '%s seconds'
                WHERE token = %s AND expiry > NOW()
                RETURNING user_id
                """,
                (Config.TOKEN_EXPIRY_SECONDS, token)  # The expiration time and token are passed as parameters
            )
            # Fetch the result from the UPDATE query
            result = cur.fetchone()
            # If the result exists, it means the token is valid, so we return the user_id
            if result:
                user_id = result[0]
                return Ok(user_id)
            # If no result was returned, the token is either expired or doesn't exist, so return an error
            return Err("Token expired")


# Function to expire (delete) a valid token in PostgreSQL
def expire_valid_token(token: str) -> Result[None, None]:
    # Use `with` to ensure the connection and transaction are handled properly
    with DB.pool.connection() as conn:
        # Use `with` for cursor to ensure it's closed correctly
        with conn.cursor() as cur:
            # Delete the token from the user_tokens table using a parameterized query to avoid SQL injection
            cur.execute("DELETE FROM user_tokens WHERE token = %s", (token,))  # Use tuple for sanitization

            # If no rows were affected (i.e., the token didn't exist), return an error
            if cur.rowcount == 0:
                return Err(None)

            # If the token was successfully deleted, return Ok
            return Ok(None)



# TODO: Delete all keys for a user

#function for when I delete the tokens, repalcing the delete on cascade stuff
def delete_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    # Open a connection to the database
    with DB.pool.connection() as conn:
        # Open a cursor to execute SQL queries
        with conn.cursor() as cur:
            # Delete all tokens associated with the given user_id
            cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
            # Check if any tokens were deleted
            if cur.rowcount > 0:
                # If tokens were deleted, return success
                return Ok(None)
            else:
                # If no tokens were found for this user, return an error
                return Err("No tokens found for this user")

