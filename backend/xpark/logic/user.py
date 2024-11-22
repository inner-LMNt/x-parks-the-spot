from xpark.utils.db import DB
from xpark.utils.password import password_hasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import uuid
from xpark.config import Config
import pandas as pd
import os
from result import Result, Ok, Err, is_err
from typing import cast, Tuple, Dict
import secrets
from psycopg.rows import dict_row
from xpark.utils.mailer import generate_templated_email, send_email


def handle_user_registration(
    name: str, email: str, password: str
) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if the email already exists in the database
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            user_data = cur.fetchone()

            if user_data:
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


def get_user_name_by_id(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()

            if not user_data:
                return Err("User not found")

            return Ok(user_data[0])


def get_user_email_by_id(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()

            if not user_data:
                return Err("User not found")

            return Ok(user_data[0])


def is_user_deleted(email: str) -> bool:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT deleted_at FROM users WHERE email = %s", (email,))
            return cur.fetchone() != (None,)


def handle_confirm_delete(token: str) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Get user id from deletion token
            cur.execute(
                "SELECT user_id FROM user_delete_requests WHERE token = %s AND expiry > NOW()",
                (token,),
            )
            result = cur.fetchone()
            if result:
                user_id = result[0]
            else:
                return Err("Invalid or expired token")

            # Perform the account deletion (soft delete)
            cur.execute("UPDATE users SET deleted_at = NOW() WHERE id = %s", (user_id,))

            # Log the user out by deleting all tokens
            delete_all_tokens_for_user(user_id)

            return Ok(None)


def handle_delete_account_request(
    user_id: uuid.UUID, password: str
) -> Result[None, str]:
    # Step 1: Get the user's email by ID
    user_email = get_user_email_by_id(user_id).unwrap()

    # Step 2: Check if the password is correct
    if is_err(check_username_password(user_email, password)):
        return Err("Invalid password")

    # Step 3: Generate a deletion token
    delete_token = secrets.token_urlsafe(32)

    # Step 4: Store the deletion request
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Clean up any expired tokens in the database
            # FIXME: Move to a background job
            cur.execute("DELETE FROM user_delete_requests WHERE expiry <= NOW()")

            cur.execute(
                "INSERT INTO user_delete_requests (user_id, token, expiry) VALUES (%s, %s, NOW() + %s * INTERVAL '1 seconds')",
                (user_id, delete_token, Config.DELETE_RESET_EXPIRY_SECONDS),
            )

    # Step 5: Send the email with the deletion link
    delete_link = f"{Config.BASE_HOST}/confirm-deletion/{delete_token}"
    send_email(
        to=user_email,
        subject="XPark: Delete Account Confirmation",
        content=generate_templated_email(
            "delete_account",
            name=get_user_name_by_id(user_id).unwrap(),
            delete_link=delete_link,
        ),
    )
    return Ok(None)


def expire_all_tokens_for_user(user_id: uuid.UUID) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_tokens WHERE user_id = %s", (user_id,))
            return Ok(None)


def get_user_id_by_email(email: str) -> Result[uuid.UUID, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            user_data = cur.fetchone()
            if not user_data:
                return Err("User not found")

            return Ok(user_data[0])


def handle_password_reset_request(email: str) -> Result[None, str]:
    # Check if the email exists in the database
    if not check_if_user_exists(email):
        return Err("Email not found")

    if is_user_deleted(email):
        return Err("User is deleted")

    match get_user_id_by_email(email):
        case Err(e):
            return Err(f"Failed to retrieve user ID: {e}")
        case Ok(user_id):
            pass  # Proceed with user_id

    reset_token = secrets.token_urlsafe(32)

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # FIXME: Move to a background job
            cur.execute("DELETE FROM user_delete_requests WHERE expiry <= NOW()")

            cur.execute(
                "INSERT INTO user_pw_reset_requests (user_id, token, expiry) VALUES (%s, %s, NOW() + %s * INTERVAL '1 seconds')",
                (user_id, reset_token, Config.DELETE_RESET_EXPIRY_SECONDS),
            )

    reset_link = f"{Config.BASE_HOST}/confirm-reset/{reset_token}"
    send_email(
        to=email,
        subject="XPark: Reset Password",
        content=generate_templated_email(
            "reset_password",
            name=get_user_name_by_id(user_id).unwrap(),
            reset_link=reset_link,
        ),
    )

    return Ok(None)


def handle_password_reset_confirmation(
    token: str, new_password: str
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM user_pw_reset_requests WHERE token = %s AND expiry > NOW()",
                (token,),
            )
            result = cur.fetchone()
            if result:
                user_id = result[0]
            else:
                return Err("Invalid or expired token")

    # Step 3: Update the user's password
    change_password(user_id, new_password)

    # Expire all tokens
    expire_all_tokens_for_user(user_id)

    return Ok(None)


def handle_get_name(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()

            if not user_data:
                return Err("User not found")

            return Ok(user_data[0])


def handle_set_notification_time(user_id: uuid.UUID, time: str) -> Result[None, str]:
    query = """
            UPDATE users
            SET user_preferences = COALESCE(user_preferences, '{}'::jsonb) || jsonb_build_object('notification_time', %s::text)
            WHERE id = %s
            """

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (time, str(user_id)))
            if cur.rowcount == 0:
                return Err("User not found")

            return Ok(None)


def handle_get_notification_time(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_preferences->>'notification_time' FROM users WHERE id = %s",
                (str(user_id),),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")

            return Ok(result[0])


base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "../static/data/uscities.csv")
CITIES_DATA = pd.read_csv(csv_path)


def validate_city_state(state: str, city: str) -> bool:
    state = state.strip().upper()
    city = city.strip().lower()

    matching_rows = CITIES_DATA[
        (CITIES_DATA["state_id"] == state) & (CITIES_DATA["city"].str.lower() == city)
    ]
    return not matching_rows.empty


def set_user_location_request(
    user_id: uuid.UUID, state: str, city: str
) -> Result[None, str]:
    city = city.title()
    if city != "None":
        if not validate_city_state(state, city):
            return Err("Invalid city-state combination")

    query = """
            UPDATE users
            SET state_city = COALESCE(state_city, '{}'::jsonb) || jsonb_build_object('state', %s::text, 'city', %s::text)
            WHERE id = %s
            """

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (state, city, str(user_id)))
            if cur.rowcount == 0:
                return Err("User not found")

            return Ok(None)


def get_user_location_request(user_id: uuid.UUID) -> Result[Dict[str, str], str]:
    query = """
            SELECT state_city->>'state', state_city->>'city'
            FROM users
            WHERE id = %s
            """

    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (str(user_id),))
            result = cur.fetchone()
            if not result:
                return Err("User not found")

            return Ok({"state": result[0], "city": result[1]})


def handle_get_points(user_id: uuid.UUID) -> Result[Dict[str, int], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT (points->>'total')::integer as total, (points->>'current')::integer as current FROM users WHERE id = %s",
                (user_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")
            return Ok(result)


def handle_get_transaction_history(
    user_id: uuid.UUID,
) -> Result[list[Dict[str, int]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    balance_after_transaction,
                    description,
                    points_amount,
                    transaction_type
                FROM points_transaction
                WHERE user_id = %s
                """,
                (user_id,),
            )
            result = cur.fetchall()
            if not result:
                return Err("User not found")
            return Ok(result)


def handle_buy_badge(user_id: uuid.UUID, badge_id: int) -> Result[None, str]:
    # Might want to change this later by storing shop items in a separate table
    # Right now, they're all hardcoded
    id_to_name = {
        1: "Bronze",
        2: "Silver",
        3: "Gold",
    }

    id_to_price = {
        1: 500,
        2: 1000,
        3: 2000,
    }
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check sufficient points
            cur.execute(
                "SELECT points FROM users WHERE id = %s FOR UPDATE",
                (user_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")
            points = result[0]
            price = id_to_price[badge_id]
            if points["current"] < price:
                return Err("Insufficient points")

            # Check if badge already exists
            cur.execute(
                "SELECT badges FROM users WHERE id = %s",
                (user_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")
            badges = result[0]
            if str(badge_id) in badges:
                return Err("Badge already purchased")

            # Update points and badges
            cur.execute(
                "UPDATE users SET points = jsonb_set(points, '{current}', ((points->>'current')::integer - %s)::text::jsonb) WHERE id = %s",
                (price, user_id),
            )
            cur.execute(
                "UPDATE users SET badges = array_append(badges, %s::text) WHERE id = %s",
                (badge_id, user_id),
            )

            description = f"Badge purchase: {id_to_name[badge_id]}"

            cur.execute(
                """
                INSERT INTO points_transaction (user_id, transaction_type, points_amount, description, balance_after_transaction, status)
                VALUES (%s, 'spend', %s, %s, %s, 'active')
                """,
                (user_id, price, description, points["current"] - price),
            )

            return Ok(None)


def handle_get_badge_list(user_id: uuid.UUID) -> Result[list[int], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT badges FROM users WHERE id = %s",
                (user_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")

            return Ok(result["badges"])


def handle_buy_raffle_ticket(user_id: uuid.UUID, raffle_id: int) -> Result[None, str]:
    # Might want to change this later by storing shop items in a separate table
    # Right now, they're all hardcoded
    id_to_name = {
        4: "$10 Gift Card",
    }

    id_to_price = {
        4: 750,
    }
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check sufficient points
            cur.execute(
                "SELECT points FROM users WHERE id = %s FOR UPDATE",
                (user_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")
            points = result[0]
            price = id_to_price[raffle_id]
            if int(points["current"]) < price:
                return Err("Insufficient points")

            # Update points and raffle tickets
            cur.execute(
                "UPDATE users SET points = jsonb_set(points, '{current}', ((points->>'current')::integer - %s)::text::jsonb) WHERE id = %s",
                (price, user_id),
            )

            description = f"Raffle ticket purchase: {id_to_name[raffle_id]}"

            cur.execute(
                """
                INSERT INTO points_transaction (user_id, transaction_type, points_amount, description, balance_after_transaction, status)
                VALUES (%s, 'spend', %s, %s, %s, 'active')
                """,
                (user_id, price, description, int(points["current"]) - price),
            )

            return Ok(None)


def handle_get_raffle_tickets(user_id: uuid.UUID) -> Result[Dict[str, int], str]:
    # Right now, only accounting for 1 raffle prize
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM points_transaction
                WHERE user_id = %s AND description LIKE %s
                AND status = 'active'
                """,
                (user_id, "Raffle ticket purchase%"),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")
            return Ok(result)


def get_responsiveness_score(user_id: uuid.UUID) -> Result[Dict[str, int], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT responsiveness_score FROM users WHERE id = %s",
                (user_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("User not found")
            return Ok(result["responsiveness_score"])
