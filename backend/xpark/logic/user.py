from xpark.utils.db import DB
from xpark.utils.password import password_hasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import uuid
from xpark.config import Config
from result import Result, Ok, Err
from typing import cast, Tuple
import datetime
import secrets
from xpark.utils.email_sender import send_deletion_email

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

                "INSERT INTO user_tokens (user_id, token, expiry) VALUES (%s, %s, NOW() + INTERVAL '2592000 seconds')",
                (
                    user_id,
                    token,
                 ),
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
            cur.execute(
                "DELETE FROM user_tokens WHERE token = %s", (token,)
            )

            if cur.rowcount == 0:
                return Err(None)

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

def handle_confirm_delete(token: str) -> Result[None, str]:
    # Step 1: Validate the deletion token
    match validate_deletion_token(token):
        case Err(e):
            return Err(f"Invalid or expired token: {e}")
        case Ok(user_id):
            pass  # Proceed to next step

    # Step 2: Check if the deletion request is still valid
    match check_deletion_request_validity(user_id):
        case Err(e):
            return Err(f"Deletion request expired: {e}")
        case Ok(_):
            pass  # Proceed to next step

    # Step 3: Perform the account deletion (soft delete)
    match soft_delete_user_account(user_id):
        case Err(e):
            return Err(f"Failed to delete account: {e}")
        case Ok(_):
            pass  # Proceed to next step

    # Step 4: Log the user out by deleting all tokens
    delete_all_tokens_for_user(user_id)

    return Ok(None)

def handle_delete_account_request(user_id: uuid.UUID, password: str) -> Result[None, str]:
    # Step 1: Get the user's email by ID
    match get_user_email_by_id(user_id):
        case Err(e):
            return Err("User not found")
        case Ok(user_email):
            pass  # Proceed to next step
    # Step 2: Check if the password is correct
    match check_username_password(user_email, password):
        case Err(e):
            return Err("Invalid password")
        case Ok(_):
            pass  # Proceed to next step
    # Step 3: Generate a deletion token
    delete_token = secrets.token_urlsafe(32)
    # Step 4: Store the deletion request
    match store_deletion_request(user_id, delete_token):
        case Err(e):
            return Err("Failed to store deletion request")
        case Ok(_):
            pass  # Proceed to next step
    # Step 5: Send the email with the deletion link
    delete_link = f"http://localhost:3000/confirm-deletion/{delete_token}"
    #send_deletion_email(user_email, delete_link)

    return Ok(None)

def expire_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
            return Ok(None)


def handle_password_reset(email: str) -> Result[None, str]:
    # Check if the email exists in the database
    if not check_if_user_exists(email):
        return Err("Email not found")

    # Generate a reset token
    reset_token = secrets.token_urlsafe(32)

    # Store the reset token in the database
    store_result = store_reset_token(email, reset_token)
    if isinstance(store_result, Err):
        return Err("Failed to store reset token")
    reset_link = f"http://localhost:3000/confirm-deletion/{reset_token}"
    # Send the password reset email
    send_email(to=user_email,
                subject="Reset password",
                content=generate_templated_email(
                        "reset_password", name="Name", reset_link=reset_link
                    ))

    return Ok(None)
