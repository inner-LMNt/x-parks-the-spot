from xpark.utils.db import DB
from xpark.utils.password import password_hasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import uuid
from xpark.config import Config
from result import Result, Ok, Err
from typing import cast, Tuple
import datetime
import secrets

def handle_user_registration(name: str, email: str, password: str) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the email already exists in the database
            cur.execute("SELECT id, deleted FROM users WHERE email = %s", (email,))
            user_data = cur.fetchone()

            if user_data:
                user_id, is_deleted = user_data

                # If the user is not deleted, return error
                if not is_deleted:
                    return Err("User already exists")

                # If the user was deleted, reactivate the account and reset the password
                new_password_hash = password_hasher.hash(password)
                cur.execute(
                    "UPDATE users SET deleted = FALSE, password_hash = %s, name = %s WHERE id = %s",
                    (new_password_hash, name, user_id)
                )
                conn.commit()

                return Ok(user_id)

            # If the user doesn't exist, create a new account
            new_password_hash = password_hasher.hash(password)
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (name, email, new_password_hash),
            )
            new_user = cur.fetchone()  # Fetch result
            if new_user:  # Ensure new_user is not None before accessing it
                return Ok(new_user[0])
            return Err("User creation failed")  # Add error handling

def check_if_user_exists(email: str) -> bool:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(1) FROM users WHERE email = %s", (email,))
            result = cur.fetchone()
            if result is None:  # Add a check to prevent indexing None
                return False
            return bool(result[0] != 0)  # Index after confirming result is not None



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



# Function to log out user from all sessions
def delete_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
                if cur.rowcount > 0:
                    return Ok(None)
                else:
                    return Err("No tokens found for this user")
    except Exception as e:
        return Err(str(e))



def get_user_email_by_id(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()

            if not user_data:
                return Err("User not found")

            return Ok(user_data[0])


def generate_deletion_token() -> Result[str, str]:
    try:
        delete_token = secrets.token_urlsafe(32)
        return Ok(delete_token)
    except Exception:
        return Err("Token generation failed")

def store_deletion_request(user_id: uuid.UUID, delete_token: str) -> Result[None, str]:
    try:
        deletion_requested_at = datetime.datetime.now()
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET deletion_requested_at = %s, deletion_token = %s WHERE id = %s",
                    (deletion_requested_at, delete_token, user_id)
                )
                conn.commit()
        return Ok(None)
    except Exception as e:
        return Err(str(e))

def check_deletion_request_validity(user_id: uuid.UUID) -> Result[None, str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT deletion_requested_at FROM users WHERE id = %s", (user_id,))
                deletion_requested_at = cur.fetchone()

                if not deletion_requested_at:
                    return Err("Deletion request not found")

                time_elapsed = datetime.datetime.now() - deletion_requested_at[0]
                if time_elapsed > datetime.timedelta(minutes=30):
                    return Err("Deletion request expired")

                return Ok(None)
    except Exception as e:
        return Err(str(e))


def reset_deletion_request(user_id: uuid.UUID) -> Result[None, str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET deletion_requested_at = NULL, deletion_token = NULL WHERE id = %s", (user_id,))
                conn.commit()
        return Ok(None)
    except Exception as e:
        return Err(str(e))

def validate_deletion_token(token: str) -> Result[uuid.UUID, str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE deletion_token = %s", (token,))
                result = cur.fetchone()
                if result:
                    user_id = result[0]
                    return Ok(user_id)
                else:
                    return Err("Invalid or expired token")
    except Exception as e:
        return Err(str(e))


def soft_delete_user_account(user_id: uuid.UUID) -> Result[None, str]:
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET deleted = TRUE WHERE id = %s", (user_id,))
                conn.commit()
        return Ok(None)
    except Exception as e:
        return Err(str(e))

def is_user_deleted(user_id: uuid.UUID) -> bool:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT deleted FROM users WHERE id = %s", (user_id,))
            result = cur.fetchone()
            if result:
                return bool(result[0])  # Assuming result[0] is the "deleted" status (True/False)
            return False  # User not found, treat as not deleted
