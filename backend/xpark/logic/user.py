from xpark.utils.db import DB
from xpark.utils.password import password_hasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import uuid
from xpark.config import Config
from result import Result, Ok, Err
from typing import cast, Tuple
import datetime
import secrets
from xpark.utils.mailer import generate_templated_email, send_email


def handle_user_registration(
    name: str, email: str, password: str
) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the email already exists in the database
            cur.execute("SELECT id, deleted FROM users WHERE email = %s", (email,))
            user_data = cur.fetchone()

            if user_data:
                user_id = user_data[0]

                if is_user_deleted(email):
                    # Fully delete the user if the account was marked as deleted
                    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
                    conn.commit()  # Commit the deletion

                else:
                    # If the account exists and is not deleted, return an error
                    return Err("User already exists")

            # Create a new account after deleting the previous one (if applicable)
            new_password_hash = password_hasher.hash(password)
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (name, email, new_password_hash),
            )
            new_user = cur.fetchone()  # Fetch result
            if new_user:
                return Ok(new_user[0])

            return Err("User creation failed")


def check_if_user_exists(email: str) -> bool:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(1) FROM users WHERE email = %s", (email,))
            result = cur.fetchone()
            if result is not None:
                return bool(result[0] != 0)  # Index after confirming result is not None
            return False


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

    if is_user_deleted(email):
        return Err("User doesn't exist")

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
                "INSERT INTO user_tokens (user_id, token, expiry) VALUES (%s, %s, NOW() + %s * INTERVAL '1 seconds')",
                (user_id, token, Config.TOKEN_EXPIRY_SECONDS),
            )

            # Clean up any expired tokens in the database
            # FIXME: Move to a background job so that it doesn't run on every login
            cur.execute("DELETE FROM user_tokens WHERE expiry <= NOW()")

            return token


def validate_token_and_refresh(token: str) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the given token is still valid (not expired) and refresh its expiry time
            cur.execute(
                """
                UPDATE user_tokens
                SET expiry = NOW() + INTERVAL '%s seconds'
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
            cur.execute("DELETE FROM user_tokens WHERE token = %s", (token,))

            if cur.rowcount == 0:
                return Err(None)

            return Ok(None)


# Function to log out user from all sessions
def delete_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
            if cur.rowcount > 0:
                return Ok(None)
            else:
                return Err("No tokens found for this user")


def get_user_email_by_id(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()

            if not user_data:
                return Err("User not found")

            return Ok(user_data[0])


def validate_and_check_deletion_token(
    token: str, user_id: uuid.UUID
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the token and user_id match and retrieve the deletion request timestamp
            cur.execute(
                "SELECT deletion_requested_at FROM users WHERE deletion_token = %s AND id = %s",
                (token, user_id),
            )
            result = cur.fetchone()

            if not result:
                return Err("Invalid or expired token")

            deletion_requested_at = result[0]

            # Check if the deletion request is still valid (not expired)
            time_elapsed = datetime.datetime.now() - deletion_requested_at
            if time_elapsed > datetime.timedelta(minutes=30):
                return Err("Deletion request expired")
            return Ok(None)


def reset_deletion_request(user_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET deletion_requested_at = NULL, deletion_token = NULL WHERE id = %s",
                (user_id,),
            )
            conn.commit()
    return Ok(None)


def is_user_deleted(email: str) -> bool:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT deleted FROM users WHERE email = %s", (email,))
            result = cur.fetchone()
            return bool(result[0]) if result else False


def get_id_from_deletion_token(token: str) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE deletion_token = %s", (token,))
            result = cur.fetchone()
            if result:
                user_id = result[0]
                return Ok(user_id)
            else:
                return Err("Invalid or expired token")


def handle_confirm_delete(token: str) -> Result[None, str]:
    user_id = get_id_from_deletion_token(token)
    if user_id.is_err():
        return Err(f"Invalid Token: {user_id.unwrap_err()}")
    user_id = user_id.unwrap()

    # Step 1: Validate the deletion token
    valid = validate_and_check_deletion_token(token, user_id)
    if valid.is_err():
        return Err(f"User not found: {valid.unwrap_err()}")
    # Step 2: Perform the account deletion (soft delete)

    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET deleted = TRUE WHERE id = %s", (user_id,))
                conn.commit()
    except Exception as e:
        return Err(f"Failed to delete account: {e}")

    # Step 3: Log the user out by deleting all tokens
    delete_all_tokens_for_user(user_id)

    return Ok(None)


def handle_delete_account_request(
    user_id: uuid.UUID, password: str
) -> Result[None, str]:
    # Step 1: Get the user's email by ID
    match get_user_email_by_id(user_id):
        case Err(e):
            return Err(f"User not found: {e}")
        case Ok(user_email):
            pass  # Proceed to next step

    # Step 2: Check if the password is correct
    match check_username_password(user_email, password):
        case Err(e):
            return Err(f"Invalid password: {e}")
        case Ok(_):
            pass  # Proceed to next step

    # Step 3: Generate a deletion token
    delete_token = secrets.token_urlsafe(32)

    # Step 4: Store the deletion request
    try:
        deletion_requested_at = datetime.datetime.now()
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET deletion_requested_at = %s, deletion_token = %s WHERE id = %s",
                    (deletion_requested_at, delete_token, user_id),
                )
                conn.commit()
    except Exception as e:
        return Err(f"Failed to store deletion request: {e}")

    # Step 5: Send the email with the deletion link
    delete_link = f"http://{Config.BASE_HOST}/confirm-deletion/{delete_token}"
    send_email(
        to=user_email,
        subject="Delete Account",
        content=generate_templated_email(
            "delete_account", name="User", delete_link=delete_link
        ),
    )
    return Ok(None)


def expire_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
            return Ok(None)
